import * as OJP_SharedTypes from 'ojp-shared-types';
import * as OJP_Next from 'ojp-sdk-next';

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

export class Poi extends BasePlace {
  public publicCode: string;
  public name: string;

  public category: RestrictionPoiOSMTag;
  public subCategory: string | null;

  public topographicPlaceRef: string | null;
  
  private constructor(longitude: number, latitude: number, placeName: string, publicCode: string, name: string, category: RestrictionPoiOSMTag, subCategory: string | null) {
    super(longitude, latitude, 'poi', placeName);
    
    this.publicCode = publicCode;
    this.name = name;
    
    this.category = category;
    this.subCategory = subCategory;
    
    this.topographicPlaceRef = null;
  }

  public static initWithPlaceResultSchema(version: OJP_Next.OJP_VERSION, placeResultSchema: AnyPlaceResultSchema): Poi | null {
    const isOJPv2 = version === '2.0';

    const poiContainer = (() => {
      if (isOJPv2) {
        return (placeResultSchema as OJP_SharedTypes.PlaceResultSchema).place.pointOfInterest ?? null;
      } else {
        return (placeResultSchema as OJP_SharedTypes.OJPv1_LocationResultSchema).location.pointOfInterest ?? null;
      }
    })();
    if (poiContainer === null) {
      return null;
    }

    const placeName = (() => {
      if (isOJPv2) {
        return (placeResultSchema as OJP_SharedTypes.PlaceResultSchema).place.name.text;
      } else {
        return (placeResultSchema as OJP_SharedTypes.OJPv1_LocationResultSchema).location.locationName.text;
      }
    })();

    const geoPositioSchema = (() => {
      if (isOJPv2) {
        return (placeResultSchema as OJP_SharedTypes.PlaceResultSchema).place.geoPosition;
      } else {
        return (placeResultSchema as OJP_SharedTypes.OJPv1_LocationResultSchema).location.geoPosition;
      }
    })();
    const geoPosition = new OJP_Next.GeoPosition(geoPositioSchema);
    if (!geoPosition.isValid()) {
      return null;
    }

    const publicCode = (() => {
      if (isOJPv2) {
        return (poiContainer as OJP_SharedTypes.PointOfInterestSchema).publicCode;
      } else {
        return (poiContainer as OJP_SharedTypes.OJPv1_PointOfInterestSchema).pointOfInterestCode;
      }
    })();
    
    const name = (() => {
      if (isOJPv2) {
        return (poiContainer as OJP_SharedTypes.PointOfInterestSchema).name.text;
      } else {
        return (poiContainer as OJP_SharedTypes.OJPv1_PointOfInterestSchema).pointOfInterestName.text;
      }
    })();

    const categoryNodes = poiContainer.pointOfInterestCategory ?? [];

    const categories: string[] = [];
    categoryNodes.forEach(categoryNode => {
      categoryNode.pointOfInterestClassification.forEach(poiClassification => {
        categories.push(poiClassification);
      });
    });

    const category: RestrictionPoiOSMTag | null = (() => {
      if (isOJPv2) {
        if (categories.length === 0) {
          return null;
        }

        const category = categories[0] as RestrictionPoiOSMTag;
        return category;
      } else {
        let categoryOJPv1: string | null = null;
        categoryNodes.forEach(categoryNode => {
          categoryNode.osmTag.forEach(osmTagNode => {
            if (osmTagNode.tag === 'POI_0') {
              categoryOJPv1 = osmTagNode.value;
            }

            if (osmTagNode.tag === 'amenity') {
              categoryOJPv1 = osmTagNode.value;
            }
          });
        });

        if (categoryOJPv1 !== null) {
          return categoryOJPv1 as RestrictionPoiOSMTag;
        }

        return null;
      }
    })();
    if (category === null) {
      throw new Error('JSON error: cant compute POI category');
    }

    const subCategory: string | null = (() => {
      if (!isOJPv2) {
        let subCategoryOJPv1: string | null = null;
        categoryNodes.forEach(categoryNode => {
          categoryNode.osmTag.forEach(osmTagNode => {
            if (osmTagNode.tag === 'POI_1') {
              subCategoryOJPv1 = osmTagNode.value;
            }
          });
        });

        if (subCategoryOJPv1 !== null) {
          return subCategoryOJPv1;
        }
      }

      return null;
    })();

    const poi = new Poi(geoPosition.longitude, geoPosition.latitude, placeName, publicCode, name, category, subCategory);
    
    poi.properties = {};
    const poiAdditionalInformationItems = poiContainer.pOIAdditionalInformation?.pOIAdditionalInformation ?? [];
    poiAdditionalInformationItems.forEach(item => {
      poi.properties[item.key] = item.value;
    });

    return poi;
  }

  public override computeGeoJSON_Properties() {
    const properties = super.computeGeoJSON_Properties();

    properties['poi.name'] = this.name;
    properties['poi.publicCode'] = this.publicCode;
    properties['poi.categories'] = this.categories.join(', ');

    return properties;
  }
  
  // The return is a 50px image in ./src/assets/map-style-icons
  // i.e. ./src/assets/map-style-icons/poi-atm.png
  // icons from https://www.shareicon.net/author/adiante-apps
  public computePoiMapIcon(): string {
    const fallbackIcon = 'poi-unknown';

    if (this.categories.length < 1) {
        return fallbackIcon;
    }

    const category = this.categories[0];
    const subCategory = this.categories[1] ?? null;

    if (!(category in mapPoiSubCategoryIcons)) {
      return fallbackIcon;
    }

    const hasSubCategory = subCategory && (mapPoiSubCategoryIcons[category as RestrictionPoiOSMTag].indexOf(subCategory) > -1);
    if (hasSubCategory) {
      const mapIcon = 'poi-' + category + '-' + subCategory;
      return mapIcon;
    }

    const hasAllSubCategory = mapPoiSubCategoryIcons[category as RestrictionPoiOSMTag].indexOf('all') > -1;
    if (hasAllSubCategory) {
      const mapIcon = 'poi-' + category + '-all';
      return mapIcon;
    }

    return fallbackIcon;
  }

  public override computeName() {
    return this.name;
  }
}
