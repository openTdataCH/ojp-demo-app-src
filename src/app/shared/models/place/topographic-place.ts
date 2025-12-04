import * as OJP_Types from 'ojp-shared-types';
import * as OJP_Next from 'ojp-sdk-next';

// TODO - remove after migration
import OJP_Legacy from '../../../config/ojp-legacy';

import { BasePlace } from '../place';
import { AnyPlaceResultSchema } from '../../types/_all';

type POI_OSM_TagSharedMobility = 'escooter_rental' | 'car_sharing' | 'bicycle_rental' | 'charging_station'
type POI_OSM_TagPOI = 'service' | 'shopping' | 'leisure' | 'catering' | 'public' | 'parkride' | 'accommodation' | 'sbb_services' | 'other'
export type RestrictionPoiOSMTag = POI_OSM_TagSharedMobility | POI_OSM_TagPOI | 'none'

export type POI_Restriction = {
  poiType: 'shared_mobility' | 'poi'
  tags: RestrictionPoiOSMTag[]
}

const mapPoiSubCategoryIcons = <Record<RestrictionPoiOSMTag, string[]>>{
  service: ['atm', 'hairdresser'],
  shopping: ['all', 'clothes', 'optician'],
  catering: ['all'],
  accommodation: ['all'],
}

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

  public override asOJP_LegacyLocation(): OJP_Legacy.Location {
    const location = super.asOJP_LegacyLocation();
    location.locationName = this.placeName;

    return location;
  }
}
