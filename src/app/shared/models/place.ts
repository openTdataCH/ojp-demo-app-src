import * as GeoJSON from 'geojson';

import * as OJP_Types from 'ojp-shared-types';
import * as OJP_Next from 'ojp-sdk-next';

export abstract class BasePlace {
  public geoPosition: OJP_Next.GeoPosition;
  public type: OJP_Types.PlaceTypeEnum;
  public placeName: string;
  public properties: Record<string, any>;

  constructor(longitude: number, latitude: number, type: OJP_Types.PlaceTypeEnum, placeName: string) {
    this.geoPosition = new OJP_Next.GeoPosition(longitude, latitude);
    this.type = type;
    this.placeName = placeName;
    this.properties = {};
  }

  public computeGeoJSON_Properties() {
    const geoJSON_Properties: Record<string, any> = {
      type: this.type,
      name: this.placeName,
    };

    return geoJSON_Properties;
  }

  public computeName() {
    return this.placeName;
  }

  public asGeoJSONFeature(): GeoJSON.Feature<GeoJSON.Point> {
    const geoJSON_Properties: GeoJSON.GeoJsonProperties = {
      'place.type': this.type,
      'locationName': this.placeName,
    };

    for (const attrKey in this.properties) {
      geoJSON_Properties['OJP.Attr.' + attrKey] = this.properties[attrKey]
    }

    const feature: GeoJSON.Feature<GeoJSON.Point> = {
      type: 'Feature',
      properties: geoJSON_Properties,
      geometry: {
        type: 'Point',
        coordinates: [
          this.geoPosition.longitude,
          this.geoPosition.latitude
        ]
      }
    }
    
    return feature;
  }
}
