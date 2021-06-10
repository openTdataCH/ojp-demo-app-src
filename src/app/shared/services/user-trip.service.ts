import { EventEmitter, Injectable } from '@angular/core'
import * as OJP from '../ojp-sdk/index'

type LocationUpdateSource = 'SearchForm' | 'MapDragend'
interface LocationData {
  endpointType: OJP.JourneyPointType,
  location: OJP.Location | null,
  updateSource: LocationUpdateSource,
}

@Injectable( {providedIn: 'root'} )
export class UserTripService {
  public fromLocation: OJP.Location | null
  public toLocation: OJP.Location | null
  public viaLocations: OJP.Location[]

  public locationUpdated = new EventEmitter<LocationData>();

  constructor() {
    this.fromLocation = null
    this.toLocation = null
    this.viaLocations = []
  }

  updateTripEndpoint(location: OJP.Location, endpointType: OJP.JourneyPointType, updateSource: LocationUpdateSource) {
    const locationData = <LocationData>{
      endpointType: endpointType,
      location: location,
      updateSource: updateSource
    }

    if (endpointType === 'From') {
      this.fromLocation = location
    } else {
      this.toLocation = location
    }

    this.locationUpdated.emit(locationData);
  }
}