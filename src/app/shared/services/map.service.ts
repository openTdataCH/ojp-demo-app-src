import { Injectable, EventEmitter } from '@angular/core'
import mapboxgl from 'mapbox-gl';
import * as OJP from 'ojp-sdk'

export interface IMapBoundsData {
  bounds: mapboxgl.LngLatBounds
  onlyIfOutside?: boolean | null
  padding?: mapboxgl.PaddingOptions | null
}

@Injectable( {providedIn: 'root'} )
export class MapService {
  public newMapBoundsRequested = new EventEmitter<IMapBoundsData>();
  public newMapCenterAndZoomRequested = new EventEmitter<{ lnglat: mapboxgl.LngLat, zoom: number }>();

  public tryToCenterAndZoomToLocation(location: OJP.Location | null, zoomValue: number = 16.0) {
    if (location === null) {
      return
    }

    const locationLngLatLike = location.geoPosition?.asLngLat() as [number, number] ?? null
    if (locationLngLatLike === null) {
      return
    }

    const locationLngLat = new mapboxgl.LngLat(locationLngLatLike[0], locationLngLatLike[1]);
    this.newMapCenterAndZoomRequested.emit({
      lnglat: locationLngLat,
      zoom: zoomValue
    })
  }

  public initialMapCenter: mapboxgl.LngLat | null
  public initialMapZoom: number | null

  constructor() {
    this.initialMapCenter = null
    this.initialMapZoom = null
  }

  public zoomToTrip(trip: OJP.Trip) {
    const bbox = trip.computeBBOX();
    if (bbox.isValid() === false) {
      return;
    }

    const bounds = new mapboxgl.LngLatBounds(bbox.asFeatureBBOX())
    const mapData = {
      bounds: bounds
    }
    this.newMapBoundsRequested.emit(mapData);
  }
}
