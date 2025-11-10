import * as OJP_Next from 'ojp-sdk-next';

import * as GeoJSON from 'geojson';

export class GeoPositionBBOX {
  public southWest: OJP_Next.GeoPosition;
  public northEast: OJP_Next.GeoPosition;
  public center: OJP_Next.GeoPosition;

  public minLongitude: number;
  public minLatitude: number;
  public maxLongitude: number;
  public maxLatitude: number;

  constructor(geoPositions: OJP_Next.GeoPosition | OJP_Next.GeoPosition[]) {
    if (!Array.isArray(geoPositions)) {
      geoPositions = [geoPositions];
    }

    this.minLongitude = Math.min.apply(null, geoPositions.map(gp => gp.longitude));
    this.minLatitude = Math.min.apply(null, geoPositions.map(gp => gp.latitude));

    this.maxLongitude = Math.max.apply(null, geoPositions.map(gp => gp.longitude));
    this.maxLatitude = Math.max.apply(null, geoPositions.map(gp => gp.latitude));

    this.southWest = new OJP_Next.GeoPosition(this.minLongitude, this.minLatitude);
    this.northEast = new OJP_Next.GeoPosition(this.maxLongitude, this.maxLatitude);

    const centerX = (this.southWest.longitude + this.northEast.longitude) / 2;
    const centerY = (this.southWest.latitude + this.northEast.latitude) / 2;
    this.center = new OJP_Next.GeoPosition(centerX, centerY);
  }

  public static initFromGeoPosition(geoPosition: OJP_Next.GeoPosition, width_x_meters: number, width_y_meters: number): GeoPositionBBOX {
    // 7612m for 0.1deg long - for Switzerland, latitude 46.8
    // 11119m for 0.1deg lat
    const spanLongitude = width_x_meters * 0.1 / 7612;
    const spanLatitude = width_y_meters * 0.1 / 11119;

    const southWest = new OJP_Next.GeoPosition(geoPosition.longitude - spanLongitude / 2, geoPosition.latitude - spanLatitude / 2);
    const northEast = new OJP_Next.GeoPosition(geoPosition.longitude + spanLongitude / 2, geoPosition.latitude + spanLatitude / 2);

    const bbox = new GeoPositionBBOX([southWest, northEast]);
    return bbox;
  }

  public static initFromGeoJSONFeatures(features: GeoJSON.Feature[]): GeoPositionBBOX {
    const bbox = new GeoPositionBBOX([])
    
    features.forEach(feature => {
      const featureBBOX = feature.bbox ?? null;
      if (featureBBOX) {
        const bboxSW = new OJP_Next.GeoPosition(featureBBOX[0], featureBBOX[1])
        bbox.extend(bboxSW);

        const bboxNE = new OJP_Next.GeoPosition(featureBBOX[2], featureBBOX[3])
        bbox.extend(bboxNE);
      } else {
        if (feature.geometry.type === 'LineString') {
          const points = feature.geometry as GeoJSON.LineString;
          points.coordinates.forEach(pointCoords => {
            const geoPosition = new OJP_Next.GeoPosition(pointCoords[0], pointCoords[1]);
            bbox.extend(geoPosition);
          });
        }
      }
    })

    return bbox;
  }

  extend(geoPositions: OJP_Next.GeoPosition | OJP_Next.GeoPosition[]) {
    if (!Array.isArray(geoPositions)) {
      geoPositions = [geoPositions];
    }

    geoPositions.forEach(geoPosition => {
      const southWestLongitude = Math.min(this.southWest.longitude, geoPosition.longitude);
      const southWestLatitude = Math.min(this.southWest.latitude, geoPosition.latitude);
      const northEastLongitude = Math.max(this.northEast.longitude, geoPosition.longitude);
      const northEastLatitude = Math.max(this.northEast.latitude, geoPosition.latitude);

      this.southWest = new OJP_Next.GeoPosition(southWestLongitude, southWestLatitude);
      this.northEast = new OJP_Next.GeoPosition(northEastLongitude, northEastLatitude);
    });

    const centerX = (this.southWest.longitude + this.northEast.longitude) / 2;
    const centerY = (this.southWest.latitude + this.northEast.latitude) / 2;
    this.center = new OJP_Next.GeoPosition(centerX, centerY);

    this.minLongitude = this.southWest.longitude;
    this.minLatitude = this.southWest.latitude;
    this.maxLongitude = this.northEast.longitude;
    this.maxLatitude = this.northEast.latitude;
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

  isValid(): boolean {
    if (this.southWest.longitude === Infinity) {
      return false
    }

    return true;
  }

  containsGeoPosition(geoPosition: OJP_Next.GeoPosition): boolean {
    if (geoPosition.longitude < this.southWest.longitude) {
      return false
    }

    if (geoPosition.latitude < this.southWest.latitude) {
      return false
    }

    if (geoPosition.longitude > this.northEast.longitude) {
      return false
    }

    if (geoPosition.latitude > this.northEast.latitude) {
      return false
    }

    return true
  }

  public computeWidth(): number {
    const northWest = new OJP_Next.GeoPosition(this.southWest.longitude, this.northEast.latitude);
    const southEast = new OJP_Next.GeoPosition(this.northEast.longitude, this.southWest.latitude);

    const distLongitude1 = southEast.distanceFrom(this.southWest);
    const distLongitude2 = this.northEast.distanceFrom(northWest);
    const distance = (distLongitude1 + distLongitude2) / 2;
    
    return distance;
  }

  public computeHeight(): number {
    const northWest = new OJP_Next.GeoPosition(this.southWest.longitude, this.northEast.latitude);
    const southEast = new OJP_Next.GeoPosition(this.northEast.longitude, this.southWest.latitude);

    const distLatitude1 = southEast.distanceFrom(this.northEast);
    const distLatitude2 = this.southWest.distanceFrom(northWest);
    const distance = (distLatitude1 + distLatitude2) / 2;
    
    return distance;
  }

  public asPolygon(): GeoJSON.Polygon {
    const bboxSW = this.southWest;
    const bboxNW = new OJP_Next.GeoPosition(this.southWest.longitude, this.northEast.latitude);
    const bboxNE = this.northEast;
    const bboxSE = new OJP_Next.GeoPosition(this.northEast.longitude, this.southWest.latitude);
    
    const coords: GeoJSON.Position[] = [
      bboxSW.asLngLat(),
      bboxNW.asLngLat(),
      bboxNE.asLngLat(),
      bboxSE.asLngLat(),
      bboxSW.asLngLat(),
    ];

    const polygon: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [
        coords
      ],
    };

    return polygon;
  }
}
