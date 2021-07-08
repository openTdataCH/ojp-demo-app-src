import { XPathOJP } from "../helpers/xpath-ojp"

export class PointOfInterest {
  public code: string
  public name: string

  constructor(code: string, name: string) {
    this.code = code
    this.name = name
  }

  public static initFromContextNode(contextNode: Node): PointOfInterest | null {
    const code = XPathOJP.queryText('ojp:PointOfInterest/ojp:PointOfInterestCode', contextNode)
    const name = XPathOJP.queryText('ojp:PointOfInterest/ojp:PointOfInterestName/ojp:Text', contextNode)

    if (code && name) {
      const poi = new PointOfInterest(code, name)
      return poi
    }

    return null
  }
}
