import { Location } from '../../location/location'
import { LegTrack } from './leg-track'

import { TripLegDrawType, TripLegLineType, TripLegPropertiesEnum } from '../../types/map-geometry-types'
import { MapLegTypeColor } from '../../config/map-colors'
import { GeoPosition } from '../../location/geoposition'
import { GeoPositionBBOX } from '../../location/geoposition-bbox'
import { StopPointType } from '../../types/stop-point-type'

export type LegType = 'ContinousLeg' | 'TimedLeg' | 'TransferLeg'

export interface LinePointData {
  type: StopPointType,
  feature: GeoJSON.Feature<GeoJSON.Point>
}

export class TripLeg {
  public legType: LegType
  public legID: number
  public fromLocation: Location
  public toLocation: Location
  public legTrack: LegTrack | null

  constructor(legType: LegType, legIDx: number, fromLocation: Location, toLocation: Location) {
    this.legType = legType
    this.legID = legIDx
    this.fromLocation = fromLocation
    this.toLocation = toLocation
    this.legTrack = null
  }

  public computeGeoJSONFeatures(): GeoJSON.Feature[] {
    let features: GeoJSON.Feature[] = [];

    const legBeelineFeature: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: []
      }
    };

    if (legBeelineFeature.properties) {
      const drawType: TripLegDrawType = 'Beeline'
      legBeelineFeature.properties[TripLegPropertiesEnum.DrawType] = drawType;
    }

    [this.fromLocation, this.toLocation].forEach(endpointLocation => {
      const locationFeature = endpointLocation.asGeoJSONFeature();
      if (locationFeature?.properties) {
        legBeelineFeature.geometry.coordinates.push(locationFeature.geometry.coordinates);
      }
    });

    let hasLegTrackFeature = this.legTrack?.hasGeoData ?? false
    if (!hasLegTrackFeature && legBeelineFeature.geometry.coordinates.length > 1) {
      if (legBeelineFeature.properties) {
        const drawType: TripLegDrawType = 'Beeline'
        legBeelineFeature.properties[TripLegPropertiesEnum.DrawType] = drawType;

        const beelineGeoPositions: GeoPosition[] = [];
        [this.fromLocation, this.toLocation].forEach(endpointLocation => {
          if (endpointLocation.geoPosition) {
            beelineGeoPositions.push(endpointLocation.geoPosition)
          }
        });
        const bbox = new GeoPositionBBOX(beelineGeoPositions);
        legBeelineFeature.bbox = bbox.asFeatureBBOX()
      }

      features.push(legBeelineFeature);
    }

    const linePointFeatures = this.computeLinePointFeatures()
    features = features.concat(linePointFeatures)

    features = features.concat(this.computeSpecificJSONFeatures());

    features.forEach(feature => {
      if (feature.properties) {
        if (feature.properties[TripLegPropertiesEnum.DrawType] === null) {
          debugger;
        }

        feature.properties['leg.idx'] = this.legID - 1;
        feature.properties[TripLegPropertiesEnum.LegType] = this.computeLegType();
      }
    });

    return features;
  }

  private computeLegType(): string {
    if (this.legType == 'TimedLeg') {
      return 'TimedLeg'
    }

    if (this.legType == 'TransferLeg') {
      return 'TransferLeg'
    }

    if (this.legType == 'ContinousLeg') {
      return 'ContinousLeg'
    }

    debugger;
    return 'n/a';
  }

  protected computeSpecificJSONFeatures(): GeoJSON.Feature[] {
    return [];
  }

  public computeLegColor(): string {
    const color = MapLegTypeColor[this.legType] ?? MapLegTypeColor.TimedLeg
    return color
  }

  protected computeLinePointsData(): LinePointData[] {
    const linePointsData: LinePointData[] = []

    const locations = [this.fromLocation, this.toLocation]
    locations.forEach(location => {
      const locationFeature = location.asGeoJSONFeature();
      if (locationFeature?.properties) {
        const isFrom = location === this.fromLocation;
        const stopPointType: StopPointType = isFrom ? 'From' : 'To'

        linePointsData.push({
          type: stopPointType,
          feature: locationFeature
        })
      }
    });

    return linePointsData
  }

  private computeLinePointFeatures(): GeoJSON.Feature[] {
    const features: GeoJSON.Feature[] = []

    const lineType: TripLegLineType = this.computeLegLineType()

    const linePointsData = this.computeLinePointsData();

    // Add more attributes
    linePointsData.forEach(pointData => {
      const stopPointType = pointData.type
      const feature = pointData.feature

      if (feature.properties === null) {
        return;
      }

      feature.properties[TripLegPropertiesEnum.PointType] = stopPointType

      const drawType: TripLegDrawType = 'LegPoint'
      feature.properties[TripLegPropertiesEnum.DrawType] = drawType

      feature.properties[TripLegPropertiesEnum.LineType] = lineType

      feature.bbox = [
        feature.geometry.coordinates[0],
        feature.geometry.coordinates[1],
        feature.geometry.coordinates[0],
        feature.geometry.coordinates[1],
      ]

      features.push(feature);
    });

    return features
  }

  protected computeLegLineType(): TripLegLineType {
    return 'Unknown'
  }

}

