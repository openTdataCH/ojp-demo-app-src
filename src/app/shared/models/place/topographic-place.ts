import * as OJP_Types from 'ojp-shared-types';
import * as OJP_Next from 'ojp-sdk-next';

import { BasePlace } from '../place';
import { AnyPlaceResultSchema } from '../../types/_all';

export class TopographicPlace extends BasePlace {
  public topographicPlaceCode: string;
  public topographicPlaceName: string;

  private constructor(longitude: number, latitude: number, placeName: string, topographicPlaceCode: string, topographicPlaceName: string) {
    super(longitude, latitude, 'topographicPlace', placeName);
    
    this.topographicPlaceCode = topographicPlaceCode;
    this.topographicPlaceName = topographicPlaceName;
  }

  public static initWithPlaceResultSchema(version: OJP_Next.OJP_VERSION, placeResultSchema: AnyPlaceResultSchema): TopographicPlace | null {
    const isOJPv2 = version === '2.0';

    const placeName = (() => {
      if (isOJPv2) {
        return (placeResultSchema as OJP_Types.PlaceResultSchema).place.name.text;
      } else {
        return (placeResultSchema as OJP_Types.OJPv1_LocationResultSchema).location.locationName.text;
      }
    })();

    const topographicPlaceContainer = (() => {
      if (isOJPv2) {
        return (placeResultSchema as OJP_Types.PlaceResultSchema).place.topographicPlace ?? null;
      } else {
        return (placeResultSchema as OJP_Types.OJPv1_LocationResultSchema).location.topographicPlace ?? null;
      }
    })();
    if (topographicPlaceContainer === null) {
      return null;
    }

    const geoPositioSchema = (() => {
      if (isOJPv2) {
        return (placeResultSchema as OJP_Types.PlaceResultSchema).place.geoPosition;
      } else {
        return (placeResultSchema as OJP_Types.OJPv1_LocationResultSchema).location.geoPosition;
      }
    })();
    const geoPosition = new OJP_Next.GeoPosition(geoPositioSchema);
    if (!geoPosition.isValid()) {
      return null;
    }

    const topographicPlaceCode = topographicPlaceContainer.topographicPlaceCode;
    const topographicPlaceName = topographicPlaceContainer.topographicPlaceName.text;

    const topographicPlace = new TopographicPlace(geoPosition.longitude, geoPosition.latitude, placeName, topographicPlaceCode, topographicPlaceName);

    return topographicPlace;
  }
}
