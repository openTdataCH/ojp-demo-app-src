import { XPathOJP } from "../helpers/xpath-ojp"
import { GeoRestrictionPoiOSMTag } from "../types/geo-restriction.type"

const mapPoiSubCategoryIcons = <Record<GeoRestrictionPoiOSMTag, string[]>>{
  service: ['atm', 'hairdresser'],
  shopping: ['all', 'clothes', 'optician'],
  catering: ['all'],
  accommodation: ['all'],
}

export class PointOfInterest {
  public code: string
  public name: string
  public category: GeoRestrictionPoiOSMTag
  public subCategory: string
  public categoryTags: string[]

  constructor(code: string, name: string, category: GeoRestrictionPoiOSMTag, subCategory: string, categoryTags: string[]) {
    this.code = code
    this.name = name
    this.category = category
    this.subCategory = subCategory
    this.categoryTags = categoryTags
  }

  public static initFromContextNode(contextNode: Node): PointOfInterest | null {
    const code = XPathOJP.queryText('ojp:PointOfInterest/ojp:PointOfInterestCode', contextNode)
    const name = XPathOJP.queryText('ojp:PointOfInterest/ojp:PointOfInterestName/ojp:Text', contextNode)

    if (!(code && name)) {
      return null;
    }
    
    const categoryTags: string[] = []
    const categoryNodes = XPathOJP.queryNodes('ojp:PointOfInterest/ojp:PointOfInterestCategory', contextNode);
    categoryNodes.forEach(categoryNode => {
      const categoryTag = XPathOJP.queryText('ojp:OsmTag/ojp:Value', categoryNode);
      if (categoryTag) {
        categoryTags.push(categoryTag);
      }
    })

    // HACK - the subCategory is the first item
    // - we expect exactly 2 <ojp:PointOfInterestCategory> nodes
    if (categoryTags.length != 2) {
      debugger;
      return null;
    }

    const category = categoryTags[1] as GeoRestrictionPoiOSMTag;
    const subCategory = categoryTags[0];

    const poi = new PointOfInterest(code, name, category, subCategory, categoryTags);
    return poi
  }

  // The return is a 50px image in ./src/assets/map-style-icons
  // i.e. ./src/assets/map-style-icons/poi-atm.png
  // icons from https://www.shareicon.net/author/adiante-apps
  public computePoiMapIcon(): string {
    const fallbackIcon = 'poi-unknown';

    if (!(this.category in mapPoiSubCategoryIcons)) {
      return fallbackIcon;
    }

    const hasSubCategory = mapPoiSubCategoryIcons[this.category].indexOf(this.subCategory) > -1;
    if (hasSubCategory) {
      const mapIcon = 'poi-' + this.category + '-' + this.subCategory;
      return mapIcon;
    }

    const hasAllSubCategory = mapPoiSubCategoryIcons[this.category].indexOf('all') > -1;
    if (hasAllSubCategory) {
      const mapIcon = 'poi-' + this.category + '-all';
      return mapIcon;
    }

    return fallbackIcon;
  }
}
