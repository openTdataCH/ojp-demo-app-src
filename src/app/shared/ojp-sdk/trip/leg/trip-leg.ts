import { Location } from '../../location/location'
import { LegTrack } from './leg-track'

export type LegType = 'ContinousLeg' | 'TimedLeg' | 'TransferLeg'

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
      properties: {
        'draw.type': 'leg-beeline',
      },
      geometry: {
        type: 'LineString',
        coordinates: []
      }
    };

    [this.fromLocation, this.toLocation].forEach(endpointLocation => {
      const locationFeature = endpointLocation.asGeoJSONFeature();
      if (locationFeature?.properties) {
        const isFrom = endpointLocation === this.fromLocation;

        locationFeature.properties['endpoint.type'] = isFrom ? 'from' : 'to'
        locationFeature.properties['draw.type'] = 'endpoint';

        const geoPosition = endpointLocation.geoPosition
        if (geoPosition) {
          locationFeature.bbox = [
            geoPosition.longitude,
            geoPosition.latitude,
            geoPosition.longitude,
            geoPosition.latitude,
          ]
        }

        features.push(locationFeature);

        legBeelineFeature.geometry.coordinates.push(locationFeature.geometry.coordinates);
      }
    });

    if (legBeelineFeature.geometry.coordinates.length > 1) {
      features.push(legBeelineFeature);
    }

    features = features.concat(this.computeSpecificJSONFeatures());

    features.forEach(feature => {
      if (feature.properties) {
        if (feature.properties['draw.type'] === null) {
          debugger;
        }

        feature.properties['leg.idx'] = this.legID - 1;
        feature.properties['leg.type'] = this.computeLegType();
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
    const features: GeoJSON.Feature[] = [];
    return features;
  }
}

