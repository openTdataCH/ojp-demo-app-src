import mapboxgl from "mapbox-gl";

export interface MapAppLayer {
  minZoomLevel: number
  addToMap(): void
  onMapBoundsChange(): void
  features: GeoJSON.Feature[]
  onMapClick(ev: mapboxgl.MapMouseEvent): boolean
}
