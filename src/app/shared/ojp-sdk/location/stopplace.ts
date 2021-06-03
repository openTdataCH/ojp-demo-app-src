import { XpathOJP } from "../helpers/xpath-ojp"

export class StopPlace {
  public stopPlaceRef: string
  public stopPlaceName: string
  public topographicPlaceRef: string | null

  constructor(stopPlaceRef: string, stopPlaceName: string, topographicPlaceRef: string | null) {
    this.stopPlaceRef = stopPlaceRef
    this.stopPlaceName = stopPlaceName
    this.topographicPlaceRef = topographicPlaceRef
  }

  public static initFromContextNode(contextNode: Node): StopPlace | null {
    const stopPlaceRef = XpathOJP.queryText('ojp:StopPlace/ojp:StopPlaceRef', contextNode)
    const stopPlaceName = XpathOJP.queryText('ojp:StopPlace/ojp:StopPlaceName/ojp:Text', contextNode)

    if (!(stopPlaceRef && stopPlaceName)) {
      return null;
    }

    const topographicPlaceRef = XpathOJP.queryText('ojp:StopPlace/ojp:TopographicPlaceRef', contextNode)
    const stopPlace = new StopPlace(stopPlaceRef, stopPlaceName, topographicPlaceRef)

    return stopPlace
  }
}
