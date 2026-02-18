import * as GeoJSON from 'geojson';

import * as OJP_Types from 'ojp-shared-types';
import * as OJP from 'ojp-sdk';

import { DistanceData } from "./distance";
import { AnyPlace } from "./place/place-builder";
import { StopPlace } from './place/stop-place';
import { Duration } from './duration';
import { PlaceRef } from './place-ref';
import { GeoPositionBBOX } from './geo/geoposition-bbox';
import { PlaceLocation } from './place/location';

export class LinkProjection {
  public geoPositions: OJP.GeoPosition[];

  private constructor(geoPositions: OJP.GeoPosition[]) {
    this.geoPositions = geoPositions;
  }

  public static initWithPositions(positions: OJP_Types.GeoPositionSchema[]): LinkProjection | null {
    const geoPositions: OJP.GeoPosition[] = [];

    // Though we expect a LineString we need to support also some PathGuidance are using origin with 1 vertex only
    // if (positions.length < 2) {
    //   return null;
    // }
    
    positions.forEach(position => {
      const geoPosition = new OJP.GeoPosition(position.longitude, position.latitude);
      geoPositions.push(geoPosition);
    });

    const linkProjection = new LinkProjection(geoPositions);

    return linkProjection;
  }

  public asGeoJSONFeature(): GeoJSON.Feature<GeoJSON.LineString> {
    const feature: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: []
      }
    };

    this.geoPositions.forEach(geoPosition => {
      feature.geometry.coordinates.push(geoPosition.asLngLat());
    });

    const bbox = GeoPositionBBOX.initFromGeoJSONFeatures([feature]);
    feature.bbox = bbox.asFeatureBBOX();

    return feature;
  }

  public asOJP_Schema(): OJP_Types.LinkProjectionSchema {
    const schema: OJP_Types.LinkProjectionSchema = {
      position: this.geoPositions.map(el => el.asGeoPositionSchema()),
    };

    return schema;
  }
}

export class TrackSection {
  public fromPlaceRef: PlaceRef | null;
  public toPlaceRef: PlaceRef | null;

  public duration: Duration;
  public distance: DistanceData | null;

  public linkProjection: LinkProjection | null;

  public fromPlace: AnyPlace | null;
  public toPlace: AnyPlace | null;

  private constructor(fromPlaceRef: PlaceRef | null, toPlaceRef: PlaceRef | null, duration: Duration) {
    this.fromPlaceRef = fromPlaceRef;
    this.toPlaceRef = toPlaceRef;
    
    this.duration = duration;
    this.distance = null;

    this.linkProjection = null;
    
    this.fromPlace = null;
    this.toPlace = null;
  }

  public static initWithTrackSectionSchema(trackSectionSchema: OJP_Types.TrackSectionSchema | undefined, mapPlaces: Record<string, StopPlace>): TrackSection | null {
    if (trackSectionSchema === undefined) {
      return null;
    }

    const duration = Duration.initWithDurationSchema(trackSectionSchema.duration);
    if (duration === null) {
      return null;
    }
    
    const fromPlaceRef = PlaceRef.initFromPlaceRefSchema(trackSectionSchema.trackSectionStart);
    const toPlaceRef = PlaceRef.initFromPlaceRefSchema(trackSectionSchema.trackSectionEnd);

    const trackSection = new TrackSection(fromPlaceRef, toPlaceRef, duration);
    
    if (fromPlaceRef !== null) {
      trackSection.fromPlace = mapPlaces[fromPlaceRef.ref] ?? null;
    }
    if (toPlaceRef !== null) {
      trackSection.toPlace = mapPlaces[toPlaceRef.ref] ?? null;
    }

    if (trackSectionSchema.length !== undefined) {
      trackSection.distance = {
        distanceM: trackSectionSchema.length,
        source: '2b.leg.track-section.length',
      };
    }
    
    const linkProjectionCoords = trackSectionSchema.linkProjection?.position ?? [];
    if (linkProjectionCoords.length >= 1) {
      // We should have check for 2+ coords but actually we can receive also track sections with 1 coord
      trackSection.linkProjection = LinkProjection.initWithPositions(linkProjectionCoords);
    }
    
    return trackSection;
  }

  public asOJP_Schema(): OJP_Types.TrackSectionSchema {
    const schema: OJP_Types.TrackSectionSchema = {
      trackSectionStart: undefined,  // updated below
      trackSectionEnd: undefined,  // updated below
      linkProjection: undefined, // updated below
    };

    if (this.fromPlaceRef) {
      schema.trackSectionStart = {
        stopPointRef: this.fromPlaceRef.ref,
        geoPosition: undefined,
        name: {
          text: this.fromPlaceRef.name,
        }
      };
      
      if (this.fromPlace) {
        schema.trackSectionStart.geoPosition = this.fromPlace.geoPosition.asGeoPositionSchema();
      }
    }

    if (this.toPlaceRef) {
      schema.trackSectionEnd = {
        stopPointRef: this.toPlaceRef.ref,
        geoPosition: undefined,
        name: {
          text: this.toPlaceRef.name,
        }
      };
      
      if (this.toPlace) {
        schema.trackSectionEnd.geoPosition = this.toPlace.geoPosition.asGeoPositionSchema();
      }
    }

    if (this.linkProjection && (this.linkProjection.geoPositions.length > 0)) {
      schema.linkProjection = this.linkProjection.asOJP_Schema();
    }

    return schema;
  }

  public asLegacyOJP_Schema(): OJP_Types.OJPv1_TrackSectionSchema {
    const schema: OJP_Types.OJPv1_TrackSectionSchema = {
      trackStart: undefined,  // updated below
      trackEnd: undefined,  // updated below
      linkProjection: undefined, // updated below
    };

    if (this.fromPlaceRef) {
      schema.trackStart = {
        stopPointRef: this.fromPlaceRef.ref,
        geoPosition: undefined,
        locationName: {
          text: this.fromPlaceRef.name,
        }
      };
      
      if (this.fromPlace) {
        schema.trackStart.geoPosition = this.fromPlace.geoPosition.asGeoPositionSchema();
      }
    }

    if (this.toPlaceRef) {
      schema.trackEnd = {
        stopPointRef: this.toPlaceRef.ref,
        geoPosition: undefined,
        locationName: {
          text: this.toPlaceRef.name,
        }
      };
      
      if (this.toPlace) {
        schema.trackEnd.geoPosition = this.toPlace.geoPosition.asGeoPositionSchema();
      }
    }

    if (this.linkProjection && (this.linkProjection.geoPositions.length > 0)) {
      schema.linkProjection = this.linkProjection.asOJP_Schema();
    }

    return schema;
  };
}

export class PathGuidanceSection {
  public trackSection: TrackSection;
  
  public guidanceAdvice: string | null;
  public roadName: string | null;
  public turnDescription: string | null;

  private constructor(trackSection: TrackSection) {
    this.trackSection = trackSection;

    this.guidanceAdvice = null;
    this.roadName = null;
    this.turnDescription = null;
  }

  public static initWithPathGuidanceSectionSchema(pathGuidanceSectionSchema: OJP_Types.PathGuidanceSectionSchema, mapPlaces: Record<string, StopPlace>): PathGuidanceSection | null {
    const trackSection = TrackSection.initWithTrackSectionSchema(pathGuidanceSectionSchema.trackSection, mapPlaces);
    if (trackSection === null) {
      return null;
    }
    
    const pathGuidanceSection = new PathGuidanceSection(trackSection);

    pathGuidanceSection.guidanceAdvice = pathGuidanceSectionSchema.guidanceAdvice ?? null;
    pathGuidanceSection.roadName = pathGuidanceSectionSchema.roadName?.text ?? null;
    pathGuidanceSection.turnDescription = pathGuidanceSectionSchema.turnDescription?.text ?? null;
    
    return pathGuidanceSection;
  }

  public asOJP_Schema(): OJP_Types.PathGuidanceSectionSchema {
    const schema: OJP_Types.PathGuidanceSectionSchema = {
      trackSection: undefined, // updated below
      turnDescription: undefined, // updated below
      guidanceAdvice: this.guidanceAdvice ?? undefined,
      turnAction: this.guidanceAdvice ?? undefined,
      roadName: undefined, // updated below
    };

    if (this.trackSection) {
      schema.trackSection = this.trackSection.asOJP_Schema();
    }

    if (this.turnDescription) {
      schema.turnDescription = {
        text: this.turnDescription
      };
    }

    if (this.roadName) {
      schema.roadName = {
        text: this.roadName
      };
    }

    return schema;
  }

  public asLegacyOJP_Schema(): OJP_Types.OJPv1_PathGuidanceSectionSchema {
    const schema: OJP_Types.OJPv1_PathGuidanceSectionSchema = {
      trackSection: undefined, // updated below
      turnDescription: undefined, // updated below
      guidanceAdvice: this.guidanceAdvice ?? undefined,
      turnAction: this.guidanceAdvice ?? undefined,
      roadName: undefined, // updated below
    };

    if (this.trackSection) {
      schema.trackSection = this.trackSection.asLegacyOJP_Schema();
    }

    if (this.turnDescription) {
      schema.turnDescription = {
        text: this.turnDescription
      };
    }

    if (this.roadName) {
      schema.roadName = {
        text: this.roadName
      };
    }

    return schema;
  };
}

export class PathGuidance {
  public sections: PathGuidanceSection[];

  private constructor(sections: PathGuidanceSection[]) {
    this.sections = sections;
  }

  public static Empty(): PathGuidance {
    const pathGuidance = new PathGuidance([]);
    return pathGuidance;
  }

  public static initWithPathGuidanceSectionsSchema(pathGuidanceSectionsSchema: OJP_Types.PathGuidanceSectionSchema[], mapPlaces: Record<string, StopPlace>): PathGuidance {
    const sections: PathGuidanceSection[] = [];

    pathGuidanceSectionsSchema.forEach(sectionSchema => {
      const section = PathGuidanceSection.initWithPathGuidanceSectionSchema(sectionSchema, mapPlaces);
      if (section) {
        sections.push(section);
      }
    });

    const pathGuidance = new PathGuidance(sections);
    return pathGuidance;
  }
}

export class LegTrack {
  public trackSections: TrackSection[];

  private constructor(trackSections: TrackSection[]) {
    this.trackSections = trackSections;
  }

  public static Empty(): LegTrack {
    const legTrack = new LegTrack([]);
    return legTrack;
  }

  public static initWithLegTrackSectionsSchema(trackSectionsSchema: OJP_Types.TrackSectionSchema[], mapPlaces: Record<string, StopPlace>): LegTrack {
    const trackSections: TrackSection[] = [];

    trackSectionsSchema.forEach(trackSectionSchema => {
      const trackSection = TrackSection.initWithTrackSectionSchema(trackSectionSchema, mapPlaces);
      if (trackSection) {
        trackSections.push(trackSection);
      }
    });

    const legTrack = new LegTrack(trackSections);
    
    return legTrack;
  }

  public plus(otherLegTrack: LegTrack): LegTrack {
    this.trackSections = this.trackSections.concat(otherLegTrack.trackSections);
    return this;
  }

  public asOJP_Schema(): OJP_Types.LegTrackSchema {
    const schema: OJP_Types.LegTrackSchema = {
      trackSection: this.trackSections.map(el => el.asOJP_Schema())
    };

    return schema;
  };

  public asLegacyOJP_Schema(): OJP_Types.LegTrackSchema {
    const schema: OJP_Types.LegTrackSchema = {
      trackSection: this.trackSections.map(el => el.asLegacyOJP_Schema())
    };

    return schema;
  };

  public computeBestFromPlace(): AnyPlace | null {
    if (this.trackSections.length === 0) {
      return null;
    }

    const trackSection = this.trackSections[0];
    const coordsPairs = trackSection.linkProjection?.geoPositions ?? [];
    if (coordsPairs.length === 0) {
      return null;
    }

    const coordsPair = coordsPairs[0];
    const place = new PlaceLocation(coordsPair.longitude, coordsPair.latitude);

    return place;
  }

  public computeBestToPlace(): AnyPlace | null {
    if (this.trackSections.length === 0) {
      return null;
    }

    const trackSection = this.trackSections[this.trackSections.length - 1];
    const coordsPairs = trackSection.linkProjection?.geoPositions ?? [];
    if (coordsPairs.length === 0) {
      return null;
    }

    const coordsPair = coordsPairs[coordsPairs.length - 1];
    const place = new PlaceLocation(coordsPair.longitude, coordsPair.latitude);

    return place;
  }
}
