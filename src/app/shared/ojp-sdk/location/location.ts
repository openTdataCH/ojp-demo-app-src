import { XPathOJP } from "../helpers/xpath-ojp";
import { GeoPosition } from "./geoposition";
import { StopPlace } from "./stopplace";
import { Address } from "./address";
import { GeoRestrictionType } from "../types/geo-restriction.type";

export class Location {
  public address: Address | null
  public stopPointRef: string | null
  public locationName: string | null
  public stopPlace: StopPlace | null
  public geoPosition: GeoPosition | null

  constructor() {
    this.address = null
    this.stopPointRef = null;
    this.locationName = null;
    this.stopPlace = null;
    this.geoPosition = null;
  }

  public static initWithOJPContextNode(contextNode: Node): Location {
    const location = new Location();

    location.address = Address.initFromContextNode(contextNode)
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

  asGeoJSONFeature(): GeoJSON.Feature<GeoJSON.Point> | null {
    if (this.geoPosition === null) {
      return null
    }

    let featureID: string | null = null;
    let featureType: GeoRestrictionType | null = null;
    const featureProperties: GeoJSON.GeoJsonProperties = {};

    const stopPlaceRef = this.stopPlace?.stopPlaceRef ?? null;
    if (stopPlaceRef) {
      featureID = stopPlaceRef;

      featureType = 'stop'
      featureProperties['locationName'] = this.locationName ?? ''
      featureProperties['stopPlace.stopPlaceRef'] = this.stopPlace?.stopPlaceRef ?? ''
      featureProperties['stopPlace.stopPlaceName'] = this.stopPlace?.stopPlaceName ?? ''
      featureProperties['stopPlace.topographicPlaceRef'] = this.stopPlace?.topographicPlaceRef ?? ''
    }

    if (this.address) {
      featureID = this.address.addressCode;

      featureType = 'address'
      featureProperties['addressCode'] = this.address?.addressCode ?? ''
      featureProperties['addressName'] = this.address?.addressName ?? ''
      featureProperties['topographicPlaceRef'] = this.address?.topographicPlaceRef ?? ''
    }

    if (featureID === null) {
      return null;
    }

    featureProperties['type'] = featureType;

    const feature: GeoJSON.Feature<GeoJSON.Point> = {
      id: featureID,
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
