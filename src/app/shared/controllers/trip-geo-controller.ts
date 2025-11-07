import * as GeoJSON from 'geojson';

import OJP_Legacy from '../../config/ojp-legacy';

import { JourneyService } from '../models/journey-service';
import { TripLegDrawType, TripLegLineType, TripLegPropertiesEnum } from '../types/map-geometry-types';
import { GeoPositionBBOX } from '../models/geo/geoposition-bbox';

interface LinePointData {
  type: OJP_Legacy.StopPointType,
  feature: GeoJSON.Feature<GeoJSON.Point>
}

export class TripGeoController {
  private trip: OJP_Legacy.Trip;

  constructor(trip: OJP_Legacy.Trip) {
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

  private computeFromGeoPosition(): OJP_Legacy.GeoPosition | null {
    if (this.trip.legs.length === 0) {
      return null;
    }

    const firstLeg = this.trip.legs[0];
    const legGeoPosition = firstLeg.fromLocation.geoPosition;
    if (legGeoPosition !== null) {
      return legGeoPosition;
    }

    const legTrackGeoPosition = firstLeg.legTrack?.fromGeoPosition() ?? null;
    return legTrackGeoPosition;
  }

  public computeToGeoPosition(): OJP_Legacy.GeoPosition | null {
    if (this.trip.legs.length === 0) {
      return null;
    }

    const lastLeg = this.trip.legs[this.trip.legs.length - 1];
    const legGeoPosition = lastLeg.toLocation.geoPosition;
    if (legGeoPosition !== null) {
      return legGeoPosition;
    }

    const legTrackGeoPosition = lastLeg.legTrack?.toGeoPosition() ?? null;
    return legTrackGeoPosition;
  }
}

export class TripLegGeoController {
  private leg: OJP_Legacy.TripLeg;
  private useBeeLine: boolean;

  constructor(leg: OJP_Legacy.TripLeg, useBeeLine = false) {
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

        feature.properties['leg.idx'] = this.leg.legID;
        feature.properties[TripLegPropertiesEnum.LegType] = this.leg.legType;
      }
    });

    return features;
  }

  public static shouldUseBeeline(leg: OJP_Legacy.TripLeg): boolean {
    const defaultHasBeeline = (() => {
      if (leg.legTrack === null) {
        return true;
      }

      const trackSectionCoordsNo = leg.legTrack.trackSections.map(el => el.linkProjection?.coordinates.length ?? 0);
      if (trackSectionCoordsNo.length === 0) {
        return true;
      }

      const hasNoCoords = trackSectionCoordsNo[0] === 0;
      return hasNoCoords;
    })();

    if ((leg.legType === 'ContinuousLeg') || (leg.legType === 'TransferLeg')) {
      const transferLeg = leg as OJP_Legacy.TripContinuousLeg;
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

    if (leg.legType === 'TimedLeg') {
      const timedLeg = leg as OJP_Legacy.TripTimedLeg;

      const service = JourneyService.initWithOJP_LegacyJourneyService(timedLeg.service);
      const usedDetailedLine = service.hasPrecisePolyline();

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
      coordinates.push(geoPosition.asPosition());
    });

    const beelineProperties: GeoJSON.GeoJsonProperties = {};

    const drawType: TripLegDrawType = 'Beeline';
    beelineProperties[TripLegPropertiesEnum.DrawType] = drawType;

    const lineType: TripLegLineType = this.computeLegLineType();
    beelineProperties[TripLegPropertiesEnum.LineType] = lineType;

    const bbox = new GeoPositionBBOX(beelineGeoPositions);

    const beelineFeature: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature',
      properties: beelineProperties,
      geometry: {
        type: 'LineString',
        coordinates: coordinates
      },
      bbox: bbox.asFeatureBBOX()
    };

    return beelineFeature;
  }

  private computeBeelineGeoPositions(): OJP_Legacy.GeoPosition[] {
    const geoPositions: OJP_Legacy.GeoPosition[] = [];

    if (this.leg.fromLocation.geoPosition) {
      geoPositions.push(this.leg.fromLocation.geoPosition);
    }

    if (this.leg.legType === 'TimedLeg') {
      const timedLeg = this.leg as OJP_Legacy.TripTimedLeg;
      timedLeg.intermediateStopPoints.forEach(stopPoint => {
        if (stopPoint.location.geoPosition) {
          geoPositions.push(stopPoint.location.geoPosition);
        }
      });
    }

    if (this.leg.toLocation.geoPosition) {
      geoPositions.push(this.leg.toLocation.geoPosition);
    }

    return geoPositions;
  }

  private computeLegLineType(): TripLegLineType {
    const defaultType: TripLegLineType = 'Unknown';

    if (this.leg.legType === 'ContinuousLeg' || this.leg.legType === 'TransferLeg') {
      const continuousLeg = this.leg as OJP_Legacy.TripContinuousLeg;

      if (continuousLeg.isDriveCarLeg()) {
        return 'Self-Drive Car';
      }
  
      if (continuousLeg.isSharedMobility()) {
        return 'Shared Mobility';
      }
  
      if (continuousLeg.isTaxi()) {
        return 'OnDemand';
      }
  
      if (this.leg.legType === 'TransferLeg') {
        return 'Transfer';
      }
  
      if (continuousLeg.legTransportMode === 'car-ferry') {
        return 'Water';
      }

      return 'Walk';
    }
    
    if (this.leg.legType === 'TimedLeg') {
      const timedLeg = this.leg as OJP_Legacy.TripTimedLeg;
      const service = JourneyService.initWithOJP_LegacyJourneyService(timedLeg.service);
      return service.computeLegColorType();
    }

    return defaultType;
  }

  private computeLinePointFeatures(): GeoJSON.Feature[] {
    const features: GeoJSON.Feature[] = [];

    const lineType: TripLegLineType = this.computeLegLineType();

    const linePointsData = this.computeLinePointsData();

    // Add more attributes
    linePointsData.forEach(pointData => {
      const stopPointType = pointData.type;
      const feature = pointData.feature;

      if (feature.properties === null) {
        return;
      }

      feature.properties[TripLegPropertiesEnum.PointType] = stopPointType;

      const drawType: TripLegDrawType = 'LegPoint';
      feature.properties[TripLegPropertiesEnum.DrawType] = drawType;

      feature.properties[TripLegPropertiesEnum.LineType] = lineType;

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

  // TODO - this should be in be in the SDK (add to ojp-sdk-next)
  private positionAsFeature(position: GeoJSON.Position): GeoJSON.Feature<GeoJSON.Point> {
    const feature: GeoJSON.Feature<GeoJSON.Point> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Point',
        coordinates: position,
      }
    };

    return feature;
  }

  private computeLinePointsData(): LinePointData[] {
    const linePointsData: LinePointData[] = [];

    const locations = [this.leg.fromLocation, this.leg.toLocation];
    locations.forEach(location => {
      const locationFeature = location.asGeoJSONFeature();
      if (locationFeature?.properties) {
        const isFrom = location === this.leg.fromLocation;
        const stopPointType: OJP_Legacy.StopPointType = isFrom ? 'From' : 'To';

        linePointsData.push({
          type: stopPointType,
          feature: locationFeature
        });
      }
    });

    if (this.leg.legType === 'TimedLeg') {
      const timedLeg = this.leg as OJP_Legacy.TripTimedLeg;

      // Intermediate points
      timedLeg.intermediateStopPoints.forEach(stopPoint => {
        const locationFeature = stopPoint.location.asGeoJSONFeature();
        if (!locationFeature?.properties) {
          return;
        }

        linePointsData.push({
          type: 'Intermediate',
          feature: locationFeature
        });
      });
    }

    // Continous / TransferLeg - add gudance endpoints as intermediate points
    const isContinous = ((this.leg.legType === 'TransferLeg') || (this.leg.legType === 'ContinuousLeg'));
    if (isContinous) {
      const continuousLeg = this.leg as OJP_Legacy.TripContinuousLeg;
      const guidanceSections = continuousLeg.pathGuidance?.sections ?? [];
      guidanceSections.forEach((pathGuidanceSection, idx) => {
        const lineCoordinates = pathGuidanceSection.trackSection?.linkProjection?.coordinates ?? [];
        if (lineCoordinates.length === 0) {
          return;
        }

        const feature = this.positionAsFeature(lineCoordinates[0].asPosition());
        linePointsData.push({
          type: 'Intermediate',
          feature: feature,
        });

        const lastCoord = lineCoordinates[lineCoordinates.length - 1].asPosition();
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
    if (this.leg.legType === 'ContinuousLeg' || this.leg.legType === 'TransferLeg') {
      const continuousLeg = this.leg as OJP_Legacy.TripContinuousLeg;
      return this.computeContinousLegGeoJSONFeatures(continuousLeg);
    }

    if (this.leg.legType === 'TimedLeg') {
      const timedLeg = this.leg as OJP_Legacy.TripTimedLeg;
      return this.computeTimedLegGeoJSONFeatures(timedLeg);
    }

    return [];
  }

  private computeContinousLegGeoJSONFeatures(continuousLeg: OJP_Legacy.TripContinuousLeg): GeoJSON.Feature[] {
    const features: GeoJSON.Feature[] = [];

    const lineType: TripLegLineType = (() => {
      if (continuousLeg.legTransportMode === null) {
        return 'Guidance';
      }

      const sharedMobilityModes: OJP_Legacy.IndividualTransportMode[] = ['cycle', 'escooter_rental', 'bicycle_rental', 'charging_station'];
      if (sharedMobilityModes.includes(continuousLeg.legTransportMode)) {
        return 'Shared Mobility';
      }

      const autoModes: OJP_Legacy.IndividualTransportMode[] = ['car', 'car_sharing', 'self-drive-car', 'taxi', 'others-drive-car', 'car-shuttle-train', 'car-ferry'];
      if (autoModes.includes(continuousLeg.legTransportMode)) {
        return 'Self-Drive Car';
      }

      return 'Guidance';
    })();

    continuousLeg.pathGuidance?.sections.forEach((pathGuidanceSection, guidanceIDx) => {
      const feature = pathGuidanceSection.trackSection?.linkProjection?.asGeoJSONFeature();
      if (!feature?.properties) {
        return;
      }

      const drawType: TripLegDrawType = 'LegLine';
      feature.properties[TripLegPropertiesEnum.DrawType] = drawType;

      feature.properties[TripLegPropertiesEnum.LineType] = lineType;

      feature.properties['PathGuidanceSection.idx'] = guidanceIDx;
      feature.properties['PathGuidanceSection.TrackSection.RoadName'] = pathGuidanceSection.trackSection?.roadName ?? '';
      feature.properties['PathGuidanceSection.TrackSection.Duration'] = pathGuidanceSection.trackSection?.duration ?? '';
      feature.properties['PathGuidanceSection.TrackSection.Length'] = pathGuidanceSection.trackSection?.length ?? '';
      feature.properties['PathGuidanceSection.GuidanceAdvice'] = pathGuidanceSection.guidanceAdvice ?? '';
      feature.properties['PathGuidanceSection.TurnAction'] = pathGuidanceSection.turnAction ?? '';

      features.push(feature);
    });

    if (features.length === 0) {
      continuousLeg.legTrack?.trackSections.forEach(trackSection => {
        const feature = trackSection.linkProjection?.asGeoJSONFeature()
        if (feature?.properties) {
          const drawType: TripLegDrawType = 'LegLine';
          feature.properties[TripLegPropertiesEnum.DrawType] = drawType;

          feature.properties[TripLegPropertiesEnum.LineType] = this.computeLegLineType();

          features.push(feature);
        }
      });
    }

    return features;
  }

  private computeTimedLegGeoJSONFeatures(timedLeg: OJP_Legacy.TripTimedLeg): GeoJSON.Feature[] {
    const features: GeoJSON.Feature[] = [];

    const service = JourneyService.initWithOJP_LegacyJourneyService(timedLeg.service);
    const lineType: TripLegLineType = service.computeLegColorType();

    // beeline is already rendered
    if (this.useBeeLine) {
      return features;
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

        feature.properties[TripLegPropertiesEnum.LineType] = lineType;
      }
    });

    return features;
  }
}
