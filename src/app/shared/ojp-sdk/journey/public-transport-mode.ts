import { XPathOJP } from '../helpers/xpath-ojp'

type PublicTransportPictogram = 'picto-bus' | 'picto-railway' | 'picto-tram' | 'picto-rack-railway' | 'picto-funicular' | 'picto-cablecar' | 'picto-gondola' | 'picto-chairlift' | 'picto-boat' | 'car-sharing' | 'picto-bus-fallback';

export class PublicTransportMode {
  public ptMode: string
  public name: string | null
  public shortName: string | null
  public isDemandMode: boolean

  constructor(ptMode: string, name: string | null, shortName: string | null) {
    this.ptMode = ptMode
    this.name = name
    this.shortName = shortName
    this.isDemandMode = false
  }

  public static initFromServiceNode(serviceNode: Node): PublicTransportMode | null {
    const ptMode = XPathOJP.queryText('ojp:Mode/ojp:PtMode', serviceNode)

    if (ptMode === null) {
      return null
    }

    const name = XPathOJP.queryText('ojp:Mode/ojp:Name/ojp:Text', serviceNode)
    const shortName = XPathOJP.queryText('ojp:Mode/ojp:ShortName/ojp:Text', serviceNode)
    const publicTransportMode = new PublicTransportMode(ptMode, name, shortName)

    const busSubmode = XPathOJP.queryText('ojp:Mode/siri:BusSubmode', serviceNode)
    publicTransportMode.isDemandMode = busSubmode === 'demandAndResponseBus'

    return publicTransportMode
  }

  public isRail(): boolean {
    return this.ptMode === 'rail';
  }

  public computePublicTransportPictogram(): PublicTransportPictogram {
    if (this.ptMode === 'bus') {
      return 'picto-bus';
    }

    if (this.isRail()) {
      return 'picto-railway';
    }

    if (this.ptMode === 'tram') {
      return 'picto-tram';
    }

    // ojp:PtMode === funicular
    if (this.shortName === 'CC') {
      return 'picto-rack-railway';
    }
    
    // ojp:PtMode === telecabin
    if (this.shortName === 'FUN') {
      return 'picto-funicular';
    }
    if (this.shortName === 'PB') {
      return 'picto-cablecar';
    }
    if (this.shortName === 'GB') {
      return 'picto-gondola';
    }
    if (this.shortName === 'SL') {
      return 'picto-chairlift';
    }

    if (this.ptMode === 'water') {
      return 'picto-boat';
    }

    if (this.isDemandMode) {
      return 'car-sharing';
    }

    return 'picto-bus-fallback';
  }
}
