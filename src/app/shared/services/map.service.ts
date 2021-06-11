import { Injectable, EventEmitter } from '@angular/core'
import * as OJP from '../ojp-sdk/index'

type LocationUpdateSource = 'InputEndpoint'
interface LocationData {
  location: OJP.Location | null,
  zoomLevel: number
  updateSource: LocationUpdateSource,
}

@Injectable( {providedIn: 'root'} )
export class MapService {
  public centerAndZoomToEndpointRequested = new EventEmitter<OJP.JourneyPointType>();
}
