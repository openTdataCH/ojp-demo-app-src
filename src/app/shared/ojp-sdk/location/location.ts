import { XPathOJP } from "../helpers/xpath-ojp";
import { GeoPosition } from "./geoposition";
import { StopPlace } from "./stopplace";

export class Location {
  public stopPointRef: string | null
  public locationName: string | null
  public stopPlace: StopPlace | null
  public geoPosition: GeoPosition | null

  constructor() {
    this.stopPointRef = null;
    this.locationName = null;
    this.stopPlace = null;
    this.geoPosition = null;
  }

  public static initWithOJPContextNode(contextNode: Node): Location {
    const location = new Location();

    location.stopPointRef = XPathOJP.queryText('siri:StopPointRef', contextNode)
    location.locationName = XPathOJP.queryText('ojp:LocationName/ojp:Text', contextNode)
    location.stopPlace = StopPlace.initFromContextNode(contextNode)
    location.geoPosition = GeoPosition.initFromContextNode(contextNode)

    return location
  }

  public static initWithStopPlaceRef(stopPlaceRef: string, stopPlaceName: string = ''): Location {
    const location = new Location()
    location.stopPlace = new StopPlace(stopPlaceRef, stopPlaceName, null)

    return location
  }

  public static initWithLngLat(longitude: number, latitude: number): Location {
    const location = new Location()
    location.geoPosition = new GeoPosition(longitude, latitude)

    return location
  }

  asGeoJSONFeature(): GeoJSON.Feature<GeoJSON.Point> | null {
    if (this.geoPosition === null) {
      return null
    }

    const feature: GeoJSON.Feature<GeoJSON.Point> = {
      type: 'Feature',
      properties: {
        'location.locationName': this.locationName ?? '',
        'location.stopPlace.stopPlaceRef': this.stopPlace?.stopPlaceRef ?? '',
        'location.stopPlace.stopPlaceName': this.stopPlace?.stopPlaceName ?? '',
        'location.stopPlace.topographicPlaceRef': this.stopPlace?.topographicPlaceRef ?? '',
      },
      geometry: {
        type: 'Point',
        coordinates: [
          this.geoPosition.longitude,
          this.geoPosition.latitude
        ]
      }
    }

    return feature
  }
}
