import * as GeoJSON from 'geojson';

import * as OJP_Types from 'ojp-shared-types';
import * as OJP from 'ojp-sdk';

import { BasePlace } from '../place';
import { AnyPlaceResultSchema } from '../../types/_all';

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

  public static initWithPlaceResultSchema(version: OJP.OJP_VERSION, placeResultSchema: AnyPlaceResultSchema): Address | null {
    const isOJPv2 = version === '2.0';

    const addressContainer = (() => {
      if (isOJPv2) {
        return (placeResultSchema as OJP_Types.PlaceResultSchema).place.address ?? null;
      } else {
        return (placeResultSchema as OJP_Types.OJPv1_LocationResultSchema).location.address ?? null;
      }
    })();
    if (addressContainer === null) {
      return null;
    }

    const geoPositioSchema = (() => {
      if (isOJPv2) {
        return (placeResultSchema as OJP_Types.PlaceResultSchema).place.geoPosition;
      } else {
        return (placeResultSchema as OJP_Types.OJPv1_LocationResultSchema).location.geoPosition;
      }
    })();
    const geoPosition = new OJP.GeoPosition(geoPositioSchema);
    if (!geoPosition.isValid()) {
      return null;
    }

    const placeName = (() => {
      if (isOJPv2) {
        return (placeResultSchema as OJP_Types.PlaceResultSchema).place.name.text;
      } else {
        return (placeResultSchema as OJP_Types.OJPv1_LocationResultSchema).location.locationName.text;
      }
    })();

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

    properties['address.publicCode'] = this.publicCode;
    properties['address.name'] = this.addressName;
    properties['address.postCode'] = this.postCode;
    properties['address.topographicPlaceName'] = this.topographicPlaceName;
    properties['address.topographicPlaceRef'] = this.topographicPlaceRef;
    properties['address.street'] = this.street;
    properties['address.houseNumber'] = this.houseNumber;

    return properties;
  }

  public override computeName() {
    return this.addressName;
  }

  public override asGeoJSONFeature(): GeoJSON.Feature<GeoJSON.Point> {
    const feature = super.asGeoJSONFeature();
    if (feature.properties) {
      feature.properties['addressCode'] = this.publicCode;
      feature.properties['addressName'] = this.addressName;
      feature.properties['topographicPlaceRef'] = this.topographicPlaceRef;
    }
    
    return feature;
  }
}
