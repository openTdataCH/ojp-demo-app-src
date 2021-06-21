import mapboxgl from "mapbox-gl";
import { GeoPosition } from "./geoposition";

export class GeoPositionBBOX {
  public southWest: GeoPosition
  public northEast: GeoPosition

  constructor(geoPositions: GeoPosition | GeoPosition[]) {
    if (!Array.isArray(geoPositions)) {
      geoPositions = [geoPositions];
    }

    const minLongitude = Math.min.apply(null, geoPositions.map(gp => gp.longitude));
    const minLatitude = Math.min.apply(null, geoPositions.map(gp => gp.latitude));

    const maxLongitude = Math.max.apply(null, geoPositions.map(gp => gp.longitude));
    const maxLatitude = Math.max.apply(null, geoPositions.map(gp => gp.latitude));

    this.southWest = new GeoPosition(minLongitude, minLatitude);
    this.northEast = new GeoPosition(maxLongitude, maxLatitude);
  }

  extend(geoPositions: GeoPosition | GeoPosition[]) {
    if (!Array.isArray(geoPositions)) {
      geoPositions = [geoPositions];
    }

    geoPositions.forEach(geoPosition => {
      const southWestLongitude = Math.min(this.southWest.longitude, geoPosition.longitude);
      const southWestLatitude = Math.min(this.southWest.latitude, geoPosition.latitude);
      const northEastLongitude = Math.max(this.northEast.longitude, geoPosition.longitude);
      const northEastLatitude = Math.max(this.northEast.latitude, geoPosition.latitude);

      this.southWest = new GeoPosition(southWestLongitude, southWestLatitude);
      this.northEast = new GeoPosition(northEastLongitude, northEastLatitude);
    })
  }

  asFeatureBBOX(): [number, number, number, number] {
    const bbox: [number, number, number, number] = [
      this.southWest.longitude,
      this.southWest.latitude,
      this.northEast.longitude,
      this.northEast.latitude,
    ]

    return bbox
  }

  asLngLatBounds(): mapboxgl.LngLatBounds {
    const bounds = new mapboxgl.LngLatBounds()

    bounds.extend(this.southWest.asLngLat())
    bounds.extend(this.northEast.asLngLat())

    return bounds
  }

  isValid(): boolean {
    if (this.southWest.longitude === Infinity) {
      return false
    }

    return true;
  }
}
