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

  public patchLocations(mapContextLocations: Record<string, Location>) {
    [this.fromLocation, this.toLocation].forEach(location => {
      this.patchLocation(location, mapContextLocations);

      if (location.geoPosition) {
        return
      }
    })
  }

  protected patchLocation(location: Location, mapContextLocations: Record<string, Location>) {
    if (location.geoPosition) {
      return
    }

    const stopPointRef = location.stopPointRef
    if (stopPointRef && (stopPointRef in mapContextLocations)) {
      const contextLocation = mapContextLocations[stopPointRef]

      location.locationName = contextLocation.locationName
      location.stopPlace = contextLocation.stopPlace
      location.geoPosition = contextLocation.geoPosition
    }
  }

  public computeGeoJSONFeatures(): GeoJSON.Feature[] {
    let features: GeoJSON.Feature[] = [];

    const hasLegTrackFeature = this.legTrack?.hasGeoData ?? false
    if (!hasLegTrackFeature) {
      const beelineFeature = this.computeBeelineFeature()
      if (beelineFeature) {
        features.push(beelineFeature);
      }
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

  private computeBeelineFeature(): GeoJSON.Feature | null {
    const beelineGeoPositions = this.computeBeelineGeoPositions()

    if (beelineGeoPositions.length < 2) {
      return null
    }

    const coordinates: GeoJSON.Position[] = []
    beelineGeoPositions.forEach(geoPosition => {
      coordinates.push(geoPosition.asPosition())
    })

    const beelineProperties: GeoJSON.GeoJsonProperties = {}

    const drawType: TripLegDrawType = 'Beeline'
    beelineProperties[TripLegPropertiesEnum.DrawType] = drawType

    const lineType: TripLegLineType = this.computeLegLineType()
    beelineProperties[TripLegPropertiesEnum.LineType] = lineType

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

    return beelineFeature
  }

  protected computeBeelineGeoPositions(): GeoPosition[] {
    const geoPositions: GeoPosition[] = []

    const locations: Location[] = [this.fromLocation, this.toLocation]
    locations.forEach(location => {
      if (location.geoPosition) {
        geoPositions.push(location.geoPosition)
      }
    });

    return geoPositions
  }

}

