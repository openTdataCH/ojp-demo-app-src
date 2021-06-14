import { XPathOJP } from '../helpers/xpath-ojp'

export class PublicTransportMode {
  public ptMode: string
  public name: string
  public shortName: string

  constructor(ptMode: string, name: string, shortName: string) {
    this.ptMode = ptMode
    this.name = name
    this.shortName = shortName
  }

  public static initFromServiceNode(serviceNode: Node): PublicTransportMode | null {
    const ptMode = XPathOJP.queryText('ojp:Mode/ojp:PtMode', serviceNode)
    const name = XPathOJP.queryText('ojp:Mode/ojp:Name/ojp:Text', serviceNode)
    const shortName = XPathOJP.queryText('ojp:Mode/ojp:ShortName/ojp:Text', serviceNode)

    if (ptMode && name && shortName) {
      const publicTransportMode = new PublicTransportMode(ptMode, name, shortName)
      return publicTransportMode
    }

    return null
  }

  public isRail(): boolean {
    return this.ptMode === 'rail';
  }
}
