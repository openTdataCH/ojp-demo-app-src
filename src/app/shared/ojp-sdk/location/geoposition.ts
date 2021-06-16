import mapboxgl from "mapbox-gl";
import { XPathOJP } from "../helpers/xpath-ojp";

export class GeoPosition {
  public longitude: number
  public latitude: number

  constructor(longitude: number, latitude: number) {
    this.longitude = longitude
    this.latitude = latitude
  }

  public static initFromContextNode(contextNode: Node): GeoPosition | null {
    const longitudeS = XPathOJP.queryText('ojp:GeoPosition/siri:Longitude', contextNode)
    const latitudeS = XPathOJP.queryText('ojp:GeoPosition/siri:Latitude', contextNode)

    if (longitudeS === null || latitudeS === null) {
      return null
    }

    const longitude = parseFloat(longitudeS)
    const latitude = parseFloat(latitudeS)

    const geoPosition = new GeoPosition(longitude, latitude)

    return geoPosition
  }

  public static initWithFeature(feature: GeoJSON.Feature): GeoPosition | null {
    if (feature.geometry.type !== 'Point') {
      return null
    }

    const lngLatAr = (feature.geometry as GeoJSON.Point).coordinates as [number, number]
    const longitude = lngLatAr[0]
    const latitude = lngLatAr[1]

    const geoPosition = new GeoPosition(longitude, latitude)

    return geoPosition
  }

  public asLngLat(): mapboxgl.LngLat {
    const lnglat = new mapboxgl.LngLat(this.longitude, this.latitude);
    return lnglat
  }

  public asLatLngString(roundCoords: boolean = true): string {
    let s = ''

    if (roundCoords) {
      s = this.latitude.toFixed(6) + ',' + this.longitude.toFixed(6);
    } else {
      s = this.latitude + ',' + this.longitude;
    }

    return s
  }
}
