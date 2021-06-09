import { XPathOJP } from "../helpers/xpath-ojp";
import { GeoPosition } from "./geoposition";
import { StopPlace } from "./stopplace";

type SourceLocationName = 'LocationName' | 'StopPointName'

export class Location {
  public stopPlace: StopPlace | null
  public locationName: string | null
  public geoPosition: GeoPosition | null

  constructor(contextNode: Node) {
    this.locationName = XPathOJP.queryText('ojp:LocationName/ojp:Text', contextNode)
    this.stopPlace = StopPlace.initFromContextNode(contextNode)
    this.geoPosition = GeoPosition.initFromContextNode(contextNode)
  }
}
