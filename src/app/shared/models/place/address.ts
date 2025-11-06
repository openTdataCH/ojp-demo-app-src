import * as OJP_SharedTypes from 'ojp-shared-types';
import * as OJP_Next from 'ojp-sdk-next';

import { BasePlace } from '../place';

export class Address extends BasePlace {
  public publicCode: string;
  public addressName: string;
  public postCode: string | null;
  public topographicPlaceName: string | null;
  public topographicPlaceRef: string | null;
  public street: string | null;
  public houseNumber: string | null;

  private constructor(longitude: number, latitude: number, placeName: string, publicCode: string, addressName: string) {
    super(longitude, latitude, 'address', placeName);
    
    this.publicCode = publicCode;
    this.addressName = addressName;
    this.postCode = null;
    this.topographicPlaceName = null;
    this.topographicPlaceRef = null;
    this.street = null;
    this.houseNumber = null;
  }

  public static initWithPlaceResultSchema(placeResultSchema: OJP_SharedTypes.PlaceResultSchema): Address | null {
    const geoPosition = new OJP_Next.GeoPosition(placeResultSchema.place.geoPosition);
    if (!geoPosition.isValid()) {
      return null;
    }

    const addressContainer = placeResultSchema.place.address ?? null;
    if (addressContainer === null) {
      return null;
    }

    const placeName = placeResultSchema.place.name.text;
    const publicCode = addressContainer.publicCode;
    const addressName = addressContainer.name.text;

    const place = new Address(geoPosition.longitude, geoPosition.latitude, placeName, publicCode, addressName);
    place.postCode = addressContainer.postCode ?? null;
    place.topographicPlaceName = addressContainer.topographicPlaceName ?? null;
    place.topographicPlaceRef = addressContainer.topographicPlaceName ?? null;
    place.street = addressContainer.street ?? null;
    place.houseNumber = addressContainer.houseNumber ?? null;

    return place;
  }

  public override computeGeoJSON_Properties() {
    const properties = super.computeGeoJSON_Properties();

    properties['address.publicCode'] = this.publicCode ?? '';
    properties['address.name'] = this.addressName ?? '';
    properties['address.postCode'] = this.postCode ?? '';
    properties['address.topographicPlaceName'] = this.topographicPlaceName ?? '';
    properties['address.topographicPlaceRef'] = this.topographicPlaceRef ?? '';
    properties['address.street'] = this.street ?? '';
    properties['address.houseNumber'] = this.houseNumber ?? '';

    return properties;
  }
}
