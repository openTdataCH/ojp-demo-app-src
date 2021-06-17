import { Injectable, EventEmitter } from '@angular/core'
import mapboxgl from 'mapbox-gl';
import * as OJP from '../ojp-sdk/index'

@Injectable( {providedIn: 'root'} )
export class MapService {
  public centerAndZoomToEndpointRequested = new EventEmitter<OJP.JourneyPointType>();
  public mapBoundsChanged = new EventEmitter<mapboxgl.LngLatBounds>();
  public mapCenterAndZoomChanged = new EventEmitter<{ lnglat: mapboxgl.LngLat, zoom: number }>();
}
