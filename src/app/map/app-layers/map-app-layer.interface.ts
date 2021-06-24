import mapboxgl from "mapbox-gl";

export interface MapAppLayer {
  map: mapboxgl.Map

  layerKey: string
  minZoomLevel: number
  sourceId: string
  currentFeatures: GeoJSON.Feature[]
  isEnabled: boolean

  addToMap(): void
  refreshFeatures(): void
  onMapClick(ev: mapboxgl.MapMouseEvent): boolean
  enable(): void
  disable(): void
  queryNearbyFeature(lngLat: mapboxgl.LngLat): mapboxgl.MapboxGeoJSONFeature | null
}
