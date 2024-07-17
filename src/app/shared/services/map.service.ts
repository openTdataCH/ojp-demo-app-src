import { Injectable, EventEmitter } from '@angular/core'
import mapboxgl from 'mapbox-gl';
import * as OJP from 'ojp-sdk'

export interface IMapBoundsData {
  bounds: mapboxgl.LngLatBounds
  onlyIfOutside?: boolean | null
  padding?: mapboxgl.PaddingOptions | null
}

export interface IMapLocationZoomData {
  lnglat: mapboxgl.LngLatLike
  zoom: number
}

@Injectable( {providedIn: 'root'} )
export class MapService {
  public newMapBoundsRequested = new EventEmitter<IMapBoundsData>();
  public newMapCenterAndZoomRequested = new EventEmitter<IMapLocationZoomData>();

  public tryToCenterAndZoomToLocation(location: OJP.Location | null, zoomValue: number = 16.0) {
    if (location === null) {
      return
    }

    const locationLngLat = location.geoPosition?.asLngLat() ?? null
    if (locationLngLat === null) {
      return
    }

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
