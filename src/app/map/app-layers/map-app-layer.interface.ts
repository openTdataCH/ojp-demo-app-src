import mapboxgl from "mapbox-gl";

export interface MapAppLayer {
  map: mapboxgl.Map

  layerKey: string
  minZoomLevel: number
  sourceId: string
  features: GeoJSON.Feature[]
  isEnabled: boolean

  addToMap(): void
  onMapBoundsChange(): void
  onMapClick(ev: mapboxgl.MapMouseEvent): boolean
  enable(): void
  disable(): void
  queryNearbyFeature(lngLat: mapboxgl.LngLat): mapboxgl.MapboxGeoJSONFeature | null
}
