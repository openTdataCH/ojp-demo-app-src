import { XPathOJP } from "../helpers/xpath-ojp";
import { GeoPosition } from "./geoposition";
import { StopPlace } from "./stopplace";

export class Location {
  public stopPointRef: string | null
  public locationName: string | null
  public stopPlace: StopPlace | null
  public geoPosition: GeoPosition | null

  constructor(contextNode: Node) {
    this.stopPointRef = XPathOJP.queryText('siri:StopPointRef', contextNode)
    this.locationName = XPathOJP.queryText('ojp:LocationName/ojp:Text', contextNode)
    this.stopPlace = StopPlace.initFromContextNode(contextNode)
    this.geoPosition = GeoPosition.initFromContextNode(contextNode)
  }
}
