import { Injectable, EventEmitter } from '@angular/core'
import mapboxgl from 'mapbox-gl';
import * as OJP from '../ojp-sdk/index'

export interface IMapBoundsData {
  bounds: mapboxgl.LngLatBounds
  onlyIfOutside?: boolean | null
  padding?: mapboxgl.PaddingOptions | null
}

@Injectable( {providedIn: 'root'} )
export class MapService {
  public centerAndZoomToEndpointRequested = new EventEmitter<OJP.JourneyPointType>();
  public newMapBoundsRequested = new EventEmitter<IMapBoundsData>();
  public newMapCenterAndZoomRequested = new EventEmitter<{ lnglat: mapboxgl.LngLat, zoom: number }>();
}
