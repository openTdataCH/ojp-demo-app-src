import { XPathOJP } from "../helpers/xpath-ojp";
import { GeoPosition } from "./geoposition";
import { StopPlace } from "./stopplace";
import { Address } from "./address";
import { MapPoiPropertiesEnum, MapPoiTypeEnum } from "src/app/map/app-layers/map-poi-type-enum";
import { PointOfInterest } from "./poi";

export class Location {
  public address: Address | null
  public stopPointRef: string | null
  public locationName: string | null
  public stopPlace: StopPlace | null
  public geoPosition: GeoPosition | null
  public poi: PointOfInterest | null

  constructor() {
    this.address = null
    this.stopPointRef = null;
    this.locationName = null;
    this.stopPlace = null;
    this.geoPosition = null;
    this.poi = null
  }

  public static initWithOJPContextNode(contextNode: Node): Location {
    const location = new Location();

    location.address = Address.initFromContextNode(contextNode)
    location.stopPointRef = XPathOJP.queryText('siri:StopPointRef', contextNode)
    location.stopPlace = StopPlace.initFromContextNode(contextNode)
    location.geoPosition = GeoPosition.initFromContextNode(contextNode)
    location.poi = PointOfInterest.initFromContextNode(contextNode)

    let locationName = XPathOJP.queryText('ojp:LocationName/ojp:Text', contextNode)
    if (locationName === null) {
      locationName = XPathOJP.queryText('ojp:StopPointName/ojp:Text', contextNode)
    }
    location.locationName = locationName

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

  public static initWithFeature(feature: GeoJSON.Feature): Location | null {
    const geoPosition = GeoPosition.initWithFeature(feature)
    if (geoPosition === null) {
      return null
    }

    const attrs = feature.properties
    if (attrs === null) {
      return null
    }

    const location = new Location()
    location.geoPosition = geoPosition;
    location.locationName = attrs['locationName'] ?? null;

    const stopPlaceRef = attrs['stopPlace.stopPlaceRef'];
    if (stopPlaceRef) {
      const stopPlaceName = attrs['stopPlace.stopPlaceName'] ?? null;
      location.stopPlace = new StopPlace(stopPlaceRef, stopPlaceName, null)
    }

    const addressCode = attrs['addressCode'];
    if (addressCode) {
      const addressName = attrs['addressName'] ?? null;
      const topographicPlaceRef = attrs['topographicPlaceRef'] ?? null;
      location.address = new Address(addressCode, addressName, topographicPlaceRef)
    }

    return location
  }

  public static initFromLiteralCoords(inputS: string): Location | null {
    inputS = inputS.trim().replace(/\s/g, '');

    const inputMatches = inputS.match(/^([0-9\.]+?),([0-9\.]+?)$/);
    if (inputMatches === null) {
      return null
    }

    let longitude = parseFloat(inputMatches[1])
    let latitude = parseFloat(inputMatches[2])
    // In CH always long < lat
    if (longitude > latitude) {
      longitude = parseFloat(inputMatches[2])
      latitude = parseFloat(inputMatches[1])
    }

    const location = Location.initWithLngLat(longitude, latitude)
    return location
  }

  asGeoJSONFeature(): GeoJSON.Feature<GeoJSON.Point> | null {
    if (this.geoPosition === null) {
      return null
    }

    let featureType = MapPoiTypeEnum.Coordinates

    const featureProperties: GeoJSON.GeoJsonProperties = {
      'locationName': this.locationName ?? ''
    };

    const stopPlaceRef = this.stopPlace?.stopPlaceRef ?? null;
    if (stopPlaceRef) {
      featureType = MapPoiTypeEnum.PublicTransportStop

      featureProperties['stopPlace.stopPlaceRef'] = this.stopPlace?.stopPlaceRef ?? ''
      featureProperties['stopPlace.stopPlaceName'] = this.stopPlace?.stopPlaceName ?? ''
      featureProperties['stopPlace.topographicPlaceRef'] = this.stopPlace?.topographicPlaceRef ?? ''
    }

    if (this.address) {
      featureType = MapPoiTypeEnum.Address

      featureProperties['addressCode'] = this.address?.addressCode ?? ''
      featureProperties['addressName'] = this.address?.addressName ?? ''
      featureProperties['topographicPlaceRef'] = this.address?.topographicPlaceRef ?? ''
    }

    featureProperties[MapPoiPropertiesEnum.PoiType] = featureType;

    const feature: GeoJSON.Feature<GeoJSON.Point> = {
      type: 'Feature',
      properties: featureProperties,
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
