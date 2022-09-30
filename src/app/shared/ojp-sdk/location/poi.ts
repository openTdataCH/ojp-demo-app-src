import { XPathOJP } from "../helpers/xpath-ojp"
import { GeoRestrictionPoiOSMTag } from "../types/geo-restriction.type"

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
}
