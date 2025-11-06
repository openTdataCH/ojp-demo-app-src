import * as OJP_SharedTypes from 'ojp-shared-types';
import * as OJP_Next from 'ojp-sdk-next';

import { BasePlace } from '../place';

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
  public categories: string[];
  public topographicPlaceRef: string | null;
  
  private constructor(longitude: number, latitude: number, placeName: string, publicCode: string, name: string, poiCategories: string[]) {
    super(longitude, latitude, 'poi', placeName);
    
    this.publicCode = publicCode;
    this.name = name;
    this.categories = poiCategories;
    this.topographicPlaceRef = null;
  }

  public static initWithPlaceResultSchema(placeResultSchema: OJP_SharedTypes.PlaceResultSchema): Poi | null {
    const placeName = placeResultSchema.place.name.text;

    const geoPosition = new OJP_Next.GeoPosition(placeResultSchema.place.geoPosition);
    if (!geoPosition.isValid()) {
      return null;
    }

    const poiContainer = placeResultSchema.place.pointOfInterest ?? null;
    if (poiContainer === null) {
      return null;
    }

    const publicCode = poiContainer.publicCode;
    const name = poiContainer.name.text;

    const categoryNodes = poiContainer.pointOfInterestCategory ?? [];

    const categories: string[] = [];
    categoryNodes.forEach(categoryNode => {
      categoryNode.pointOfInterestClassification.forEach(poiClassification => {
        categories.push(poiClassification);
      });
    });

    if (categories.length === 0) {
      throw new Error('JSON error: cant extract categories');
    }

    const poi = new Poi(geoPosition.longitude, geoPosition.latitude, placeName, publicCode, name, categories);
    
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
}
