import * as OJP from 'ojp-sdk-v2';

import { OJPMapHelpers } from '../../helpers/ojp-map-helpers';
import { TripLegDrawType, TripLegLineType, TripLegPropertiesEnum } from '../types/map-geometry-types';

interface LinePointData {
  type: OJP.StopPointType,
  feature: GeoJSON.Feature<GeoJSON.Point>
}

export class TripGeoController {
  private trip: OJP.Trip;

  constructor(trip: OJP.Trip) {
    this.trip = trip;
  }

  public computeBBOX(): OJP.GeoPositionBBOX {
    const bbox = new OJP.GeoPositionBBOX([]);

    const fromGeoPosition = this.computeFromLocation()?.geoPosition;
    if (fromGeoPosition) {
      bbox.extend(fromGeoPosition);
    } else {
      console.error('Trip.computeBBOX - cant computeFromLocation');
      console.log(this);
    }
    
    const toGeoPosition = this.computeToLocation()?.geoPosition;
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

        bbox.extend(new OJP.GeoPosition(featureBBOX[0], featureBBOX[1]));
        bbox.extend(new OJP.GeoPosition(featureBBOX[2], featureBBOX[3]));
      });
    });

    return bbox;
  }

  private computeFromLocation(): OJP.Location | null {
    if (this.trip.legs.length === 0) {
      return null;
    }

    const firstLeg = this.trip.legs[0];
    return firstLeg.fromLocation;
  }

  public computeToLocation(): OJP.Location | null {
    if (this.trip.legs.length === 0) {
      return null;
    }

    const lastLeg = this.trip.legs[this.trip.legs.length - 1];
    return lastLeg.toLocation;
  }
}

export class TripLegGeoController {
  private leg: OJP.TripLeg;
  private legIDx: number;
  private useBeeLine: boolean;

  constructor(leg: OJP.TripLeg, legIDx: number = 0) {
    this.leg = leg;
    this.legIDx = legIDx;

    this.useBeeLine = TripLegGeoController.shouldUseBeeline(leg);
  }

  public computeGeoJSONFeatures(): GeoJSON.Feature[] {
    let features: GeoJSON.Feature[] = [];

    if (this.useBeeLine) {
      const beelineFeature = this.computeBeelineFeature();
      if (beelineFeature) {
        features.push(beelineFeature);
      }
    }
    
    const linePointFeatures = this.computeLinePointFeatures();
    features = features.concat(linePointFeatures);

    features = features.concat(this.computeLegGeoJSONFeatures());

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

  private static shouldUseBeeline(leg: OJP.TripLeg): boolean {
    const defaultValue = !(leg.legTrack && leg.legTrack.hasGeoData);

    if (leg.legType === 'ContinuousLeg') {
      return defaultValue;
    }
    
    if (leg.legType === 'TransferLeg') {
      const transferLeg = leg as OJP.TripContinuousLeg;
      if (transferLeg.pathGuidance === null) {
        return defaultValue;
      }

      let hasGeoData = false;
      transferLeg.pathGuidance.sections.forEach(section => {
        if (section.trackSection?.linkProjection) {
          hasGeoData = true;
        }
      });

      return hasGeoData === false;
    }

    if (leg.legType === 'TimedLeg') {
      const timedLeg = leg as OJP.TripTimedLeg;

      const usedDetailedLine = timedLeg.service.ptMode.hasPrecisePolyline();

      return !usedDetailedLine;
    }

    return defaultValue;
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

    const bbox = new OJP.GeoPositionBBOX(beelineGeoPositions);

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

  private computeBeelineGeoPositions(): OJP.GeoPosition[] {
    const geoPositions: OJP.GeoPosition[] = [];

    if (this.leg.fromLocation.geoPosition) {
      geoPositions.push(this.leg.fromLocation.geoPosition);
    }

    if (this.leg.legType === 'TimedLeg') {
      const timedLeg = this.leg as OJP.TripTimedLeg;
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
      const continuousLeg = this.leg as OJP.TripContinuousLeg;

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
      const timedLeg = this.leg as OJP.TripTimedLeg;
      return OJPMapHelpers.computeTimedLegColor(timedLeg);
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

  private computeLinePointsData(): LinePointData[] {
    const linePointsData: LinePointData[] = [];

    // Don't show endpoints for TransferLeg
    if (this.leg.legType === 'TransferLeg') {
      return linePointsData;
    }

    const locations = [this.leg.fromLocation, this.leg.toLocation];
    locations.forEach(location => {
      const locationFeature = location.asGeoJSONFeature();
      if (locationFeature?.properties) {
        const isFrom = location === this.leg.fromLocation;
        const stopPointType: OJP.StopPointType = isFrom ? 'From' : 'To';

        // Extend the endpoints to the LegTrack if available
        const pointGeoPosition = isFrom ? this.leg.legTrack?.fromGeoPosition() : this.leg.legTrack?.toGeoPosition();
        if (pointGeoPosition) {
          locationFeature.geometry.coordinates = pointGeoPosition.asPosition();
        }

        linePointsData.push({
          type: stopPointType,
          feature: locationFeature
        });
      }
    });

    if (this.leg.legType === 'TimedLeg') {
      const timedLeg = this.leg as OJP.TripTimedLeg;

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

    return linePointsData;
  }

  private computeLegGeoJSONFeatures(): GeoJSON.Feature[] {
    if (this.leg.legType === 'ContinuousLeg' || this.leg.legType === 'TransferLeg') {
      const continuousLeg = this.leg as OJP.TripContinuousLeg;
      return this.computeContinousLegGeoJSONFeatures(continuousLeg);
    }

    if (this.leg.legType === 'TimedLeg') {
      const timedLeg = this.leg as OJP.TripTimedLeg;
      return this.computeTimedLegGeoJSONFeatures(timedLeg);
    }

    return [];
  }

  private computeContinousLegGeoJSONFeatures(continuousLeg: OJP.TripContinuousLeg): GeoJSON.Feature[] {
    const features: GeoJSON.Feature[] = [];

    continuousLeg.pathGuidance?.sections.forEach((pathGuidanceSection, guidanceIDx) => {
      const feature = pathGuidanceSection.trackSection?.linkProjection?.asGeoJSONFeature();
      if (!feature?.properties) {
        return;
      }

      const drawType: TripLegDrawType = 'LegLine';
      feature.properties[TripLegPropertiesEnum.DrawType] = drawType;

      const lineType: TripLegLineType = 'Guidance';
      feature.properties[TripLegPropertiesEnum.LineType] = lineType;

      feature.properties['PathGuidanceSection.idx'] = guidanceIDx;
      feature.properties['PathGuidanceSection.TrackSection.RoadName'] = pathGuidanceSection.trackSection?.roadName ?? '';
      feature.properties['PathGuidanceSection.TrackSection.Duration'] = pathGuidanceSection.trackSection?.duration ?? '';
      feature.properties['PathGuidanceSection.TrackSection.Length'] = pathGuidanceSection.trackSection?.length ?? '';
      feature.properties['PathGuidanceSection.GuidanceAdvice'] = pathGuidanceSection.guidanceAdvice ?? '';
      feature.properties['PathGuidanceSection.TurnAction'] = pathGuidanceSection.turnAction ?? '';

      features.push(feature);
    });

    continuousLeg.legTrack?.trackSections.forEach(trackSection => {
      const feature = trackSection.linkProjection?.asGeoJSONFeature()
      if (feature?.properties) {
        const drawType: TripLegDrawType = 'LegLine'
        feature.properties[TripLegPropertiesEnum.DrawType] = drawType

        feature.properties[TripLegPropertiesEnum.LineType] = this.computeLegLineType();

        features.push(feature);
      }
    });

    return features;
  }

  private computeTimedLegGeoJSONFeatures(timedLeg: OJP.TripTimedLeg): GeoJSON.Feature[] {
    let features: GeoJSON.Feature[] = [];

    const lineType: TripLegLineType = OJPMapHelpers.computeTimedLegColor(timedLeg);

    const useDetailedTrack = !this.useBeeLine;
    if (useDetailedTrack) {
      timedLeg.legTrack?.trackSections.forEach(trackSection => {
        const feature = trackSection.linkProjection?.asGeoJSONFeature();
        if (feature?.properties) {
          const drawType: TripLegDrawType = 'LegLine';
          feature.properties[TripLegPropertiesEnum.DrawType] = drawType;

          feature.properties[TripLegPropertiesEnum.LineType] = lineType;

          features.push(feature);
        }
      });
    }

    return features;
  }
}
