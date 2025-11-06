import * as OJP_SharedTypes from 'ojp-shared-types';
import * as OJP_Next from 'ojp-sdk-next';

// TODO - remove after migration
import OJP_Legacy from '../../config/ojp-legacy';

export abstract class BasePlace extends OJP_Next.GeoPosition {
  public type: OJP_SharedTypes.PlaceTypeEnum;
  public placeName: string;

  constructor(longitude: number, latitude: number, type: OJP_SharedTypes.PlaceTypeEnum, placeName: string) {
    super(longitude, latitude);

    this.type = type;
    this.placeName = placeName;
  }

  public computeGeoJSON_Properties() {
    const properties: Record<string, any> = {
      type: this.type,
      name: this.placeName,
    };

    return properties;
  }

  public computeName() {
    return this.placeName;
  }

  // TODO - remove after migration
  public asOJP_LegacyLocation(): OJP_Legacy.Location {
    const location = new OJP_Legacy.Location();
    location.geoPosition = new OJP_Legacy.GeoPosition(this.longitude, this.latitude);

    return location;
  }
}
