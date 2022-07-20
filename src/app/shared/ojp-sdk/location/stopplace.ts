import { XPathOJP } from "../helpers/xpath-ojp"

// OJP reference - these are the same?
//  - 8.4.5.2 StopPoint Structure
//  - 8.4.5.3 StopPlace Structure
type StopType = 'StopPlace' | 'StopPoint'

export class StopPlace {
  public stopPlaceRef: string
  public stopPlaceName: string
  public topographicPlaceRef: string | null
  public stopType: StopType

  constructor(stopPlaceRef: string, stopPlaceName: string, topographicPlaceRef: string | null,  stopType: StopType = 'StopPlace') {
    this.stopPlaceRef = stopPlaceRef
    this.stopPlaceName = stopPlaceName
    this.topographicPlaceRef = topographicPlaceRef
    this.stopType = stopType
  }

  public static initFromContextNode(contextNode: Node): StopPlace | null {
    let stopType: StopType = 'StopPlace';
    let stopPlaceRef = XPathOJP.queryText('ojp:StopPlace/ojp:StopPlaceRef', contextNode)
    let stopPlaceName = XPathOJP.queryText('ojp:StopPlace/ojp:StopPlaceName/ojp:Text', contextNode)

    if (!(stopPlaceRef && stopPlaceName)) {
      // Try to build the StopPlace from StopPoint
      stopType = 'StopPoint';
      stopPlaceRef = XPathOJP.queryText('ojp:StopPoint/siri:StopPointRef', contextNode)
      stopPlaceName = XPathOJP.queryText('ojp:StopPoint/ojp:StopPointName/ojp:Text', contextNode)
    }

    if (!(stopPlaceRef && stopPlaceName)) {
      return null;
    }

    const topographicPlaceRef = XPathOJP.queryText('ojp:StopPlace/ojp:TopographicPlaceRef', contextNode)
    const stopPlace = new StopPlace(stopPlaceRef, stopPlaceName, topographicPlaceRef)

    return stopPlace
  }

  public static initFromServiceNode(serviceNode: Node, pointType: 'Origin' | 'Destination'): StopPlace | null {
    const stopPlaceRef = XPathOJP.queryText('ojp:' + pointType + 'StopPointRef', serviceNode);
    const stopPlaceText = XPathOJP.queryText('ojp:' + pointType + 'Text/ojp:Text', serviceNode);

    if (!(stopPlaceRef && stopPlaceText)) {
      return null;
    }

    const stopPlace = new StopPlace(stopPlaceRef, stopPlaceText, null, 'StopPlace');
    return stopPlace;
  }
}
