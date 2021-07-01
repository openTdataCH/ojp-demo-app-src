import mapboxgl from "mapbox-gl";

export class MapHelpers {
  public static formatMapboxLngLatAsLatLng(lnglat: mapboxgl.LngLat): string {
    const lnglatS = lnglat.lat.toFixed(6) + ',' + lnglat.lng.toFixed(6);
    return lnglatS;
  }

  public static computePointLngLatFromFeature(feature: GeoJSON.Feature): mapboxgl.LngLat | null {
    if (feature.geometry.type !== 'Point') {
      return null
    }

    const featureCoords: mapboxgl.LngLatLike = (feature.geometry as GeoJSON.Point).coordinates as [number, number]
    const featureLngLat = mapboxgl.LngLat.convert(featureCoords)

    return featureLngLat
  }

  public static bboxPxFromLngLatWidthPx(map: mapboxgl.Map, lngLat: mapboxgl.LngLat, width: number, height: number | null = null): [mapboxgl.PointLike, mapboxgl.PointLike] {
    if (height === null) {
      height = width
    }

    const pointPx = map.project(lngLat);
    const bboxPx: [mapboxgl.PointLike, mapboxgl.PointLike] = [
      [
        pointPx.x - width / 2,
        pointPx.y + height * 1.2,
      ],
      [
        pointPx.x + width / 2,
        pointPx.y + height * 0.2,
      ]
    ]

    return bboxPx
  }

  public static areBoundsInsideOtherBounds(bounds: mapboxgl.LngLatBounds, otherBounds: mapboxgl.LngLatBounds): boolean {
    if (bounds.getWest() < otherBounds.getWest()) {
      return false
    }

    if (bounds.getNorth() > otherBounds.getNorth()) {
      return false
    }

    if (bounds.getEast() > otherBounds.getEast()) {
      return false
    }

    if (bounds.getSouth() < otherBounds.getSouth()) {
      return false
    }

    return true
  }
}
