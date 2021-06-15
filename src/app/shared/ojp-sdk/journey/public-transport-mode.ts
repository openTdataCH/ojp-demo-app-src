import { XPathOJP } from '../helpers/xpath-ojp'

export class PublicTransportMode {
  public ptMode: string
  public name: string | null
  public shortName: string | null

  constructor(ptMode: string, name: string | null, shortName: string | null) {
    this.ptMode = ptMode
    this.name = name
    this.shortName = shortName
  }

  public static initFromServiceNode(serviceNode: Node): PublicTransportMode | null {
    const ptMode = XPathOJP.queryText('ojp:Mode/ojp:PtMode', serviceNode)

    if (ptMode === null) {
      return null
    }

    const name = XPathOJP.queryText('ojp:Mode/ojp:Name/ojp:Text', serviceNode)
    const shortName = XPathOJP.queryText('ojp:Mode/ojp:ShortName/ojp:Text', serviceNode)
    const publicTransportMode = new PublicTransportMode(ptMode, name, shortName)

    return publicTransportMode
  }

  public isRail(): boolean {
    return this.ptMode === 'rail';
  }
}
