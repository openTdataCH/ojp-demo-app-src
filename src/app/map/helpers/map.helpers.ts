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
}
