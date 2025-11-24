import * as OJP_Types from 'ojp-shared-types';
import * as OJP_Next from 'ojp-sdk-next';

// TODO - remove after migration
import OJP_Legacy from '../../config/ojp-legacy';

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

  // TODO - remove after migration
  public asOJP_LegacyLocation(): OJP_Legacy.Location {
    const location = new OJP_Legacy.Location();
    location.updateLegacyGeoPosition(this.geoPosition.longitude, this.geoPosition.latitude);
    location.attributes = this.computeGeoJSON_Properties();

    return location;
  }
}
