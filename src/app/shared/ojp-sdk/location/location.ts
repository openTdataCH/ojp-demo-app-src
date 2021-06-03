import { XpathOJP } from "../helpers/xpath-ojp";
import { GeoPosition } from "./geoposition";
import { StopPlace } from "./stopplace";

type SourceLocationName = 'LocationName' | 'StopPointName'

export class Location {
  public stopPlace: StopPlace | null
  public locationName: string | null
  public geoPosition: GeoPosition | null

  constructor(contextNode: Node) {
    this.stopPlace = StopPlace.initFromContextNode(contextNode)
    this.locationName = XpathOJP.queryText('ojp:LocationName/ojp:Text', contextNode)
    this.geoPosition = GeoPosition.initFromContextNode(contextNode)
  }
}
