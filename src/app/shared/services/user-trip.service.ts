import { EventEmitter, Injectable } from '@angular/core'
import { MapPoiPropertiesEnum, MapPoiTypeEnum } from '../../map/app-layers/map-poi-type-enum'
import * as OJP from '../ojp-sdk/index'

type LocationUpdateSource = 'SearchForm' | 'MapDragend' | 'MapPopupClick'
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
  public tripMotTypes: OJP.TripMotType[]

  public locationUpdated = new EventEmitter<LocationData>();
  public tripsUpdated = new EventEmitter<OJP.Trip[]>();
  public activeTripSelected = new EventEmitter<OJP.Trip | null>();
  public viaAtIndexRemoved = new EventEmitter<number>();

  constructor() {
    this.fromLocation = null
    this.toLocation = null
    this.viaLocations = []
    this.tripMotTypes = ['Default']
  }

  updateTripEndpoint(location: OJP.Location, endpointType: OJP.JourneyPointType, updateSource: LocationUpdateSource) {
    const locationData = <LocationData>{
      endpointType: endpointType,
      location: location,
      updateSource: updateSource
    }

    if (endpointType === 'From') {
      this.fromLocation = location
    }

    if (endpointType === 'To') {
      this.toLocation = location
    }

    if (endpointType === 'Via') {
      this.viaLocations.push(location)
      this.tripMotTypes.push('Default')

      const featureProperties = location.geoPosition?.properties
      if (featureProperties) {
        const tripMotIdx = this.viaLocations.length

        const poiType: MapPoiTypeEnum | null = featureProperties[MapPoiPropertiesEnum.PoiType] ?? null

        if (poiType === 'BikeSharing') {
          this.tripMotTypes[tripMotIdx - 1] = 'Walking'
          this.tripMotTypes[tripMotIdx] = 'Shared Mobility'
        }

        if (poiType === 'ParkAndRail') {
          this.tripMotTypes[tripMotIdx - 1] = 'Self-Driving Car'
          this.tripMotTypes[tripMotIdx] = 'Default'
        }
      }
    }

    this.locationUpdated.emit(locationData);
    this.activeTripSelected.emit(null);
  }

  updateTrips(trips: OJP.Trip[]) {
    this.tripsUpdated.emit(trips)
    if (trips.length > 0) {
      this.activeTripSelected.emit(trips[0]);
    } else {
      this.activeTripSelected.emit(null);
    }
  }

  removeViaAtIndex(idx: number) {
    this.viaLocations.splice(idx, 1)
    this.tripMotTypes.splice(idx, 1)

    // Reset the tripMotTypes
    if (this.viaLocations.length === 0) {
      this.tripMotTypes = ['Default']
    }

    this.viaAtIndexRemoved.emit(idx);
    this.activeTripSelected.emit(null);
  }

  computeJourneyRequestParams(departureDate: Date): OJP.JourneyRequestParams | null {
    const requestParams = OJP.JourneyRequestParams.initWithLocationsAndDate(
      this.fromLocation,
      this.toLocation,
      this.viaLocations,
      this.tripMotTypes,
      departureDate
    )

    return requestParams
  }
}
