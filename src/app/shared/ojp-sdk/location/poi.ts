import { XPathOJP } from "../helpers/xpath-ojp"

export class PointOfInterest {
  public code: string
  public name: string
  public categoryTags: string[]

  constructor(code: string, name: string, categoryTags: string[]) {
    this.code = code
    this.name = name
    this.categoryTags = categoryTags
  }

  public static initFromContextNode(contextNode: Node): PointOfInterest | null {
    const code = XPathOJP.queryText('ojp:PointOfInterest/ojp:PointOfInterestCode', contextNode)
    const name = XPathOJP.queryText('ojp:PointOfInterest/ojp:PointOfInterestName/ojp:Text', contextNode)
    
    const categoryTags: string[] = []
    const categoryNodes = XPathOJP.queryNodes('ojp:PointOfInterest/ojp:PointOfInterestCategory', contextNode);
    categoryNodes.forEach(categoryNode => {
      const categoryTag = XPathOJP.queryText('ojp:OsmTag/ojp:Value', categoryNode);
      if (categoryTag) {
        categoryTags.push(categoryTag);
      }
    })

    if (code && name) {
      const poi = new PointOfInterest(code, name, categoryTags)
      return poi
    }

    return null
  }
}
