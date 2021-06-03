import { XpathOJP } from "../helpers/xpath-ojp";

export class GeoPosition {
  public longitude: number
  public latitude: number

  constructor(longitude: number, latitude: number) {
      this.longitude = longitude
      this.latitude = latitude
  }

  public static initFromContextNode(contextNode: Node): GeoPosition | null {
      const longitudeS = XpathOJP.queryText('ojp:GeoPosition/siri:Longitude', contextNode)
      const latitudeS = XpathOJP.queryText('ojp:GeoPosition/siri:Latitude', contextNode)

      if (longitudeS === null || latitudeS === null) {
          return null
      }

      const longitude = parseFloat(longitudeS)
      const latitude = parseFloat(latitudeS)

      const geoPosition = new GeoPosition(longitude, latitude)

      return geoPosition
  }
}
