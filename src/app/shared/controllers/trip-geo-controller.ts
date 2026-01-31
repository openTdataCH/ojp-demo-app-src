import * as GeoJSON from 'geojson';

import * as OJP_Next from 'ojp-sdk-next';

import { TripLegDrawType, TripLegLineType, TripLegPropertiesEnum } from '../types/map-geometry-types';

import { GeoPositionBBOX } from '../models/geo/geoposition-bbox';
import { MapLegLineTypeColor } from '../../config/map-colors';
import { OJPHelpers } from 'src/app/helpers/ojp-helpers';
import { AnyLeg } from '../models/trip/leg-builder';
import { Trip } from '../models/trip/trip';
import { TransferLeg } from '../models/trip/leg/transfer-leg';
import { TimedLeg } from '../models/trip/leg/timed-leg';
import { AnyPlace } from '../models/place/place-builder';
import { ContinuousLeg } from '../models/trip/leg/continuous-leg';

type StopCallType = 'From' | 'To' | 'Intermediate';

interface LinePointData {
  type: StopCallType,
  feature: GeoJSON.Feature<GeoJSON.Point>
}

export class TripGeoController {
  private trip: Trip;

  constructor(trip: Trip) {
    this.trip = trip;
  }

  public computeBBOX(): GeoPositionBBOX {
    const bbox = new GeoPositionBBOX([]);

    const fromGeoPosition = this.computeFromGeoPosition();
    if (fromGeoPosition) {
      bbox.extend(fromGeoPosition);
    } else {
      console.error('Trip.computeBBOX - cant computeFromLocation');
      console.log(this);
    }
    
    const toGeoPosition = this.computeToGeoPosition();
    if (toGeoPosition) {
      bbox.extend(toGeoPosition);
    } else {
      console.error('Trip.computeBBOX - cant computeToLocation');
      console.log(this);
    }

    this.trip.legs.forEach(leg => {
      const tripLegGeoController = new TripLegGeoController(leg);
      const features = tripLegGeoController.computeGeoJSONFeatures();
      features.forEach(feature => {
        const featureBBOX = feature.bbox ?? null;
        if (featureBBOX === null) {
          return;
        }

        bbox.extend(new OJP_Next.GeoPosition(featureBBOX[0], featureBBOX[1]));
        bbox.extend(new OJP_Next.GeoPosition(featureBBOX[2], featureBBOX[3]));
      });
    });

    return bbox;
  }

  private computeFromGeoPosition(): OJP_Next.GeoPosition | null {
    if (this.trip.legs.length === 0) {
      return null;
    }

    const firstLeg = this.trip.legs[0];
    const legGeoPosition = firstLeg.fromPlace?.geoPosition ?? null;
    if (legGeoPosition) {
      return legGeoPosition;
    }

    if (firstLeg.legTrack.trackSections.length > 0) {
      const trackSection = firstLeg.legTrack.trackSections[0];
      if (trackSection.fromPlace) {
        return trackSection.fromPlace.geoPosition;
      }
    }

    return null;
  }

  public computeToGeoPosition(): OJP_Next.GeoPosition | null {
    if (this.trip.legs.length === 0) {
      return null;
    }

    const lastLeg = this.trip.legs[this.trip.legs.length - 1];
    const legGeoPosition = lastLeg.toPlace?.geoPosition;
    if (legGeoPosition) {
      return legGeoPosition;
    }

    if (lastLeg.legTrack.trackSections.length > 0) {
      const trackSection = lastLeg.legTrack.trackSections[lastLeg.legTrack.trackSections.length - 1];
      if (trackSection.toPlace) {
        return trackSection.toPlace.geoPosition;
      }
    }

    return null;
  }
}

export class TripLegGeoController {
  private leg: AnyLeg;
  private useBeeLine: boolean;

  constructor(leg: AnyLeg, useBeeLine = false) {
    this.leg = leg;

    this.useBeeLine = useBeeLine;
  }

  public computeGeoJSONFeatures(): GeoJSON.Feature[] {
    let features: GeoJSON.Feature[] = [];

    const linePointFeatures = this.computeLinePointFeatures();
    features = features.concat(linePointFeatures);

    const legLineFeatures = this.computeLegLineGeoJSONFeatures();
    if (legLineFeatures.length === 0) {
      // build a bee-line at least
      const feature = this.computeBeelineFeature();
      if (feature) {
        features.push(feature);
      }
    } else {
      features = features.concat(legLineFeatures);
    }

    features.forEach(feature => {
      if (feature.properties) {
        if (feature.properties[TripLegPropertiesEnum.DrawType] === null) {
          debugger;
        }

        feature.properties['leg.idx'] = this.leg.id;
        feature.properties[TripLegPropertiesEnum.LegType] = this.leg.type;
      }
    });

    return features;
  }

  public static shouldUseBeeline(leg: AnyLeg): boolean {
    const defaultHasBeeline = (() => {
      if (leg.legTrack === null) {
        return true;
      }

      const trackSectionCoordsNo = leg.legTrack.trackSections.map(el => el.linkProjection?.geoPositions.length ?? 0);
      if (trackSectionCoordsNo.length === 0) {
        return true;
      }

      const hasNoCoords = trackSectionCoordsNo[0] === 0;
      return hasNoCoords;
    })();

    if ((leg.type === 'ContinuousLeg') || (leg.type === 'TransferLeg')) {
      const transferLeg = leg as TransferLeg;
      if (transferLeg.pathGuidance === null) {
        return defaultHasBeeline;
      }

      let hasPathGuidance = false;
      transferLeg.pathGuidance.sections.forEach(section => {
        if (section.trackSection?.linkProjection) {
          hasPathGuidance = true;
        }
      });

      return hasPathGuidance === false;
    }

    if (leg.type === 'TimedLeg') {
      const timedLeg = leg as TimedLeg;

      const usedDetailedLine = timedLeg.service.hasPrecisePolyline();

      return !usedDetailedLine;
    }

    return defaultHasBeeline;
  }

  private computeBeelineFeature(): GeoJSON.Feature | null {
    const beelineGeoPositions = this.computeBeelineGeoPositions();

    if (beelineGeoPositions.length < 2) {
      return null;
    }

    const coordinates: GeoJSON.Position[] = [];
    beelineGeoPositions.forEach(geoPosition => {
      coordinates.push(geoPosition.asLngLat());
    });

    const beelineProperties: GeoJSON.GeoJsonProperties = {};

    const drawType: TripLegDrawType = 'Beeline';
    beelineProperties[TripLegPropertiesEnum.DrawType] = drawType;

    const lineType = OJPHelpers.computeLegLineType(this.leg);
    beelineProperties[TripLegPropertiesEnum.LineColor] = MapLegLineTypeColor[lineType];

    const bbox = new GeoPositionBBOX(beelineGeoPositions);

    const beelineFeature: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature',
      properties: beelineProperties,
      geometry: {
        type: 'LineString',
        coordinates: coordinates,
      },
      bbox: bbox.asFeatureBBOX(),
    };

    return beelineFeature;
  }

  private computeBeelineGeoPositions(): OJP_Next.GeoPosition[] {
    const geoPositions: OJP_Next.GeoPosition[] = [];

    if (this.leg.fromPlace?.geoPosition) {
      geoPositions.push(this.leg.fromPlace?.geoPosition);
    }

    if (this.leg.type === 'TimedLeg') {
      const timedLeg = this.leg as TimedLeg;
      timedLeg.intermediateStopCalls.forEach(stopCall => {
        if (stopCall.place?.geoPosition) {
          geoPositions.push(stopCall.place?.geoPosition);
        }
      });
    }

    if (this.leg.toPlace?.geoPosition) {
      geoPositions.push(this.leg.toPlace?.geoPosition);
    }

    return geoPositions;
  }

  private computeLinePointFeatures(): GeoJSON.Feature[] {
    const features: GeoJSON.Feature[] = [];

    const lineType = OJPHelpers.computeLegLineType(this.leg);
    const linePointsData = this.computeLinePointsData();

    // Add more attributes
    linePointsData.forEach(pointData => {
      const stopPointType = pointData.type;
      const feature = pointData.feature;

      if (feature.properties === null) {
        return;
      }

      feature.properties[TripLegPropertiesEnum.PointType] = stopPointType;

      feature.properties[TripLegPropertiesEnum.LineColor] = MapLegLineTypeColor[lineType];

      feature.bbox = [
        feature.geometry.coordinates[0],
        feature.geometry.coordinates[1],
        feature.geometry.coordinates[0],
        feature.geometry.coordinates[1],
      ];

      features.push(feature);
    });

    return features;
  }

  private positionAsFeature(geoPosition: OJP_Next.GeoPosition): GeoJSON.Feature<GeoJSON.Point> {
    const feature: GeoJSON.Feature<GeoJSON.Point> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Point',
        coordinates: geoPosition.asLngLat(),
      }
    };

    return feature;
  }

  private computeLinePointsData(): LinePointData[] {
    const linePointsData: LinePointData[] = [];

    const places: AnyPlace[] = [];
    if (this.leg.fromPlace) {
      places.push(this.leg.fromPlace);
    }
    if (this.leg.toPlace) {
      places.push(this.leg.toPlace);
    }
    
    places.forEach(place => {
      if (this.leg.type !== 'TimedLeg') {
        // Display From/To only for TimedLeg features
        return;
      }

      const feature = place.asGeoJSONFeature();

      const isFrom = place === this.leg.fromPlace;
      const stopCallType: StopCallType = isFrom ? 'From' : 'To';

      linePointsData.push({
        type: stopCallType,
        feature: feature
      });
    });

    if (this.leg.type === 'TimedLeg') {
      const timedLeg = this.leg as TimedLeg;

      // Intermediate points
      timedLeg.intermediateStopCalls.forEach(stopCall => {
        const feature = stopCall.place?.asGeoJSONFeature() ?? null;
        if (!feature) {
          return;
        }

        linePointsData.push({
          type: 'Intermediate',
          feature: feature
        });
      });
    }

    // Continous / TransferLeg - add gudance endpoints as intermediate points
    const isContinous = ((this.leg.type === 'TransferLeg') || (this.leg.type === 'ContinuousLeg'));
    if (isContinous) {
      const continuousLeg = this.leg as ContinuousLeg;

      continuousLeg.pathGuidance.sections.forEach((pathGuidanceSection, idx) => {
        const lineGeoPositions = pathGuidanceSection.trackSection.linkProjection?.geoPositions ?? [];
        if (lineGeoPositions.length === 0) {
          return;
        }

        const feature = this.positionAsFeature(lineGeoPositions[0]);
        linePointsData.push({
          type: 'Intermediate',
          feature: feature,
        });

        const lastCoord = lineGeoPositions[lineGeoPositions.length - 1];
        const lastFeature = this.positionAsFeature(lastCoord);
        linePointsData.push({
          type: 'Intermediate',
          feature: lastFeature,
        });
      });
    }

    return linePointsData;
  }

  private computeLegLineGeoJSONFeatures(): GeoJSON.Feature[] {
    if (this.leg.type === 'ContinuousLeg') {
      const continuousLeg = this.leg as ContinuousLeg;
      return this.computeContinousLegGeoJSONFeatures(continuousLeg);
    }

    if (this.leg.type === 'TimedLeg') {
      const timedLeg = this.leg as TimedLeg;
      return this.computeTimedLegGeoJSONFeatures(timedLeg);
    }

    return [];
  }

  private computeContinousLegGeoJSONFeatures(continuousLeg: ContinuousLeg): GeoJSON.Feature[] {
    const features: GeoJSON.Feature[] = [];

    const lineType: TripLegLineType = (() => {


      const defaultMode: TripLegLineType = 'Walk';

      return defaultMode;
    })();

    continuousLeg.pathGuidance.sections.forEach((pathGuidanceSection, guidanceIDx) => {
      const feature = pathGuidanceSection.trackSection.linkProjection?.asGeoJSONFeature() ?? null;
      if (!feature?.properties) {
        return;
      }

      const drawType: TripLegDrawType = (() => {
        if (this.leg.type === 'ContinuousLeg') {
          const continousLeg = this.leg as ContinuousLeg;
          if (continousLeg.service.personalMode !== 'foot') {
            return 'LegLine';
          }
        }

        return 'WalkLine';
      })();
      feature.properties[TripLegPropertiesEnum.DrawType] = drawType;
      feature.properties[TripLegPropertiesEnum.LineColor] = MapLegLineTypeColor[lineType];

      feature.properties['PathGuidanceSection.idx'] = guidanceIDx;
      feature.properties['PathGuidanceSection.TrackSection.RoadName'] = pathGuidanceSection.roadName ?? '';
      feature.properties['PathGuidanceSection.TrackSection.Duration'] = pathGuidanceSection.trackSection?.duration.durationText ?? '';
      feature.properties['PathGuidanceSection.TrackSection.Length'] = pathGuidanceSection.trackSection?.distance?.distanceM ?? '';
      feature.properties['PathGuidanceSection.GuidanceAdvice'] = pathGuidanceSection.guidanceAdvice ?? '';
      feature.properties['PathGuidanceSection.TurnAction'] = pathGuidanceSection.turnDescription ?? '';

      features.push(feature);
    });

    if (features.length === 0) {
      continuousLeg.legTrack?.trackSections.forEach(trackSection => {
        const feature = trackSection.linkProjection?.asGeoJSONFeature()
        if (feature?.properties) {
          const drawType: TripLegDrawType = 'WalkLine';
          feature.properties[TripLegPropertiesEnum.DrawType] = drawType;
          feature.properties[TripLegPropertiesEnum.LineColor] = MapLegLineTypeColor[lineType];
          
          features.push(feature);
        }
      });
    }

    return features;
  }

  private computeTimedLegGeoJSONFeatures(timedLeg: TimedLeg): GeoJSON.Feature[] {
    const features: GeoJSON.Feature[] = [];

    const lineType: TripLegLineType = timedLeg.service.computeLegColorType();

    // beeline is already rendered
    if (this.useBeeLine) {
      return [];
    }

    const trackSections = timedLeg.legTrack?.trackSections ?? [];
    trackSections.forEach(trackSection => {
      const feature = trackSection.linkProjection?.asGeoJSONFeature() ?? null;
      if (feature) {
        features.push(feature);
      }
    });

    // apply the needed properties
    features.forEach(feature => {
      if (feature.properties) {
        const drawType: TripLegDrawType = 'LegLine';
        feature.properties[TripLegPropertiesEnum.DrawType] = drawType;
        feature.properties[TripLegPropertiesEnum.LineColor] = MapLegLineTypeColor[lineType];
      }
    });

    return features;
  }
}
