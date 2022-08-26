import { EventEmitter, Injectable } from '@angular/core'

import { APP_CONFIG } from 'src/app/config/app-config'
import { MapService } from './map.service'

import * as OJP from '../ojp-sdk/index'

type LocationUpdateSource = 'SearchForm' | 'MapDragend' | 'MapPopupClick'

@Injectable( {providedIn: 'root'} )
export class UserTripService {
  private queryParams: URLSearchParams

  public fromTripLocation: OJP.TripLocationPoint | null
  public toTripLocation: OJP.TripLocationPoint | null
  public viaTripLocations: OJP.TripLocationPoint[]
  
  // Used by the src/app/search-form/search-form.component.html template
  public journeyTripsPlaceholder: string[]
  
  public tripModeTypes: OJP.TripModeType[]
  public tripTransportModes: OJP.IndividualTransportMode[]
  
  public lastJourneyResponse: OJP.JourneyResponse | null
  public departureDate: Date
  public currentAppStage: OJP.APP_Stage

  public permalinkURLAddress: string | null

  public defaultsInited = new EventEmitter<void>();
  public locationsUpdated = new EventEmitter<void>();
  public geoLocationsUpdated = new EventEmitter<void>();
  public tripsUpdated = new EventEmitter<OJP.Trip[]>();
  public activeTripSelected = new EventEmitter<OJP.Trip | null>();

  public viaAtIndexRemoved = new EventEmitter<number>();
  public viaAtIndexUpdated = new EventEmitter<{location: OJP.Location, idx: number}>();

  public searchParamsReset = new EventEmitter<void>();

  constructor(private mapService: MapService) {
    this.queryParams = new URLSearchParams(document.location.search)

    this.fromTripLocation = null
    this.toTripLocation = null
    this.viaTripLocations = []
    
    this.journeyTripsPlaceholder = ['-']
    this.tripModeTypes = ['monomodal']
    this.tripTransportModes = ['public_transport']
    
    this.lastJourneyResponse = null
    this.departureDate = this.computeInitialDate()
    this.currentAppStage = 'PROD'

    this.permalinkURLAddress = null

    this.initDefaults()
  }

  private initDefaults() {
    const defaultLocationsPlaceRef = {
      "Bern": "8507000",
      "Geneva": "8501008",
      "Gurten": "8507099",
      "St. Gallen": "8506302",
      "Uetliberg": "8503057",
      "Zurich": "8503000",
      "DemandLegFrom": "46.674360,6.460966",
      "DemandLegTo": "46.310963,7.977509",
    }
    const fromPlaceRef = this.queryParams.get('from') ?? defaultLocationsPlaceRef.Bern
    const toPlaceRef = this.queryParams.get('to') ?? defaultLocationsPlaceRef.Zurich

    const promises: Promise<OJP.Location[]>[] = [];

    const endpointTypes: OJP.JourneyPointType[] = ['From', 'To']
    endpointTypes.forEach(endpointType => {
      const isFrom = endpointType === 'From'

      const stopPlaceRef = isFrom ? fromPlaceRef : toPlaceRef
      const coordsLocation = OJP.Location.initFromLiteralCoords(stopPlaceRef);
      if (coordsLocation) {
        const coordsPromise = new Promise<OJP.Location[]>((resolve, reject) => {
          resolve([coordsLocation]);
        });
        promises.push(coordsPromise);
      } else {
        const stageConfig = this.getStageConfig();
        const locationInformationRequest = OJP.LocationInformationRequest.initWithStopPlaceRef(stageConfig, stopPlaceRef)
        const locationInformationPromise = locationInformationRequest.fetchResponse();
        promises.push(locationInformationPromise)
      }
    });

    const bbox = new OJP.GeoPositionBBOX([])

    const viaPartsS = this.queryParams.get('via') ?? null
    const viaParts: string[] = viaPartsS === null ? [] : viaPartsS.split(';')
    viaParts.forEach(viaKey => {
      const viaLocation = OJP.Location.initFromLiteralCoords(viaKey)
      if (viaLocation) {
        const viaTripLocaton = new OJP.TripLocationPoint(viaLocation)
        this.viaTripLocations.push(viaTripLocaton)

        if (viaLocation.geoPosition) {
          bbox.extend(viaLocation.geoPosition)
        }
      }
    });
    
    this.journeyTripsPlaceholder = [];
    this.tripModeTypes = [];
    const tripModeTypesS = this.queryParams.get('mode_types') ?? null;
    if (tripModeTypesS) {
      tripModeTypesS.split(';').forEach(tripModeTypeS => {
        this.tripModeTypes.push(tripModeTypeS as OJP.TripModeType);
        this.journeyTripsPlaceholder.push('-');
      });
    } else {
      this.journeyTripsPlaceholder = ['-'];
      this.tripModeTypes = ['monomodal'];
    }

    this.tripTransportModes = [];
    const tripTransportModesS = this.queryParams.get('transport_modes') ?? null;
    if (tripTransportModesS) {
      tripTransportModesS.split(';').forEach(tripTransportModeS => {
        this.tripTransportModes.push(tripTransportModeS as OJP.IndividualTransportMode);
      });
    } else {
      this.tripTransportModes = ['public_transport'];
    }

    let appStageS = this.queryParams.get('stage')
    if (appStageS) {
      this.currentAppStage = this.computeAppStageFromString(appStageS)
    }

    Promise.all(promises).then(locationsData => {
      endpointTypes.forEach(endpointType => {
        const isFrom = endpointType === 'From'
        const locations = isFrom ? locationsData[0] : locationsData[1];
        if (locations.length === 0) {
          return;
        }

        const firstLocation = locations[0]
        if (isFrom) {
          this.fromTripLocation = new OJP.TripLocationPoint(firstLocation)
        } else {
          this.toTripLocation = new OJP.TripLocationPoint(firstLocation)
        }

        if (firstLocation.geoPosition) {
          bbox.extend(firstLocation.geoPosition)
        }
      });

      this.locationsUpdated.emit();
      this.geoLocationsUpdated.emit();
      this.updatePermalinkAddress();

      const shouldZoomToBounds = this.queryParams.has('from') || this.queryParams.has('to')
      if (shouldZoomToBounds && !this.mapService.initialMapCenter) {
        const mapData = {
          bounds: bbox.asLngLatBounds()
        }
        this.mapService.newMapBoundsRequested.emit(mapData);
      }

      this.defaultsInited.emit();
    });
  }

  private computeAppStageFromString(appStageS: string): OJP.APP_Stage {
    const appStage = appStageS.toUpperCase() as OJP.APP_Stage
    if (appStage === 'TEST') {
      return 'TEST'
    }

    if (appStage === 'TEST LA') {
      return 'TEST LA'
    }

    return 'PROD'
  }

  updateTripEndpoint(location: OJP.Location, endpointType: OJP.JourneyPointType, updateSource: LocationUpdateSource) {
    let tripLocationRef: OJP.TripLocationPoint | null = null
    if (endpointType === 'From') {
      tripLocationRef = this.fromTripLocation
    }
    if (endpointType === 'To') {
      tripLocationRef = this.toTripLocation
    }
    
    if (tripLocationRef) {
      tripLocationRef.location = location
    }

    if (endpointType === 'Via') {
      const viaTripLocation = new OJP.TripLocationPoint(location)
      this.viaTripLocations.push(viaTripLocation)
      
      this.journeyTripsPlaceholder.push('-');
      this.tripModeTypes.push('monomodal');
      this.tripTransportModes.push('public_transport');
    }

    this.locationsUpdated.emit();
    this.geoLocationsUpdated.emit();
    this.activeTripSelected.emit(null);

    this.searchParamsReset.emit();
    this.updatePermalinkAddress();
  }

  updateViaPoint(location: OJP.Location, viaIDx: number) {
    this.viaTripLocations[viaIDx].location = location
    this.viaAtIndexUpdated.emit({
      location: location,
      idx: viaIDx
    })
    this.activeTripSelected.emit(null);

    this.searchParamsReset.emit();
    this.updatePermalinkAddress();
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
    this.viaTripLocations.splice(idx, 1);
    this.tripModeTypes.splice(idx, 1);
    this.journeyTripsPlaceholder.splice(idx, 1);
    this.tripTransportModes.splice(idx, 1);

    // Reset the tripMotTypes
    if (this.viaTripLocations.length === 0) {
      this.journeyTripsPlaceholder = ['-'];
      this.tripModeTypes = ['monomodal'];
      this.tripTransportModes = ['public_transport'];
    }

    this.viaAtIndexRemoved.emit(idx);
    this.activeTripSelected.emit(null);

    this.searchParamsReset.emit();
    this.updatePermalinkAddress();
  }

  public computeJourneyRequestParams(): OJP.JourneyRequestParams | null {
    const requestParams = OJP.JourneyRequestParams.initWithLocationsAndDate(
      this.fromTripLocation,
      this.toTripLocation,
      this.viaTripLocations,
      this.tripModeTypes,
      this.tripTransportModes,
      this.departureDate,
    )

    return requestParams
  }

  public computeTripRequestXML(departureDate: Date): string {
    const stageConfig = this.getStageConfig()
    const tripRequestParams = OJP.TripsRequestParams.initWithLocationsAndDate(this.fromTripLocation, this.toTripLocation, departureDate)
    if (tripRequestParams === null) {
      return 'BROKEN TripsRequestParams'
    }
    
    const tripRequest = new OJP.TripRequest(stageConfig, tripRequestParams)
    const tripRequestXmlS = tripRequest.computeRequestXmlString()
    
    return tripRequestXmlS
  }

  private updatePermalinkAddress() {
    const queryParams = new URLSearchParams()

    const endpointTypes: OJP.JourneyPointType[] = ['From', 'To']
    endpointTypes.forEach(endpointType => {
      const tripLocationPoint = endpointType === 'From' ? this.fromTripLocation : this.toTripLocation

      const queryParamKey = endpointType.toLowerCase()

      const stopPlaceRef = tripLocationPoint?.location.stopPlace?.stopPlaceRef ?? null
      if (stopPlaceRef) {
        queryParams.append(queryParamKey, stopPlaceRef)
      } else {
        const geoPositionLngLatS = tripLocationPoint?.location.geoPosition?.asLatLngString(true) ?? null
        if (geoPositionLngLatS) {
          queryParams.append(queryParamKey, geoPositionLngLatS)
        }
      }
    })

    const viaParamParts: string[] = []
    this.viaTripLocations.forEach(viaTripLocation => {
      const location = viaTripLocation.location;
      const geoPositionLngLatS = location?.geoPosition?.asLatLngString(true) ?? null
      if (geoPositionLngLatS) {
        viaParamParts.push(geoPositionLngLatS)
      }
    });
    if (viaParamParts.length > 0) {
      queryParams.append('via', viaParamParts.join(';'))
    }
    
    queryParams.append('mode_types', this.tripModeTypes.join(';'));
    queryParams.append('transport_modes', this.tripTransportModes.join(';'));

    const dateTimeS = OJP.DateHelpers.formatDate(this.departureDate)
    queryParams.append('trip_datetime', dateTimeS.substring(0, 16))

    const stageS = this.currentAppStage.toLowerCase()
    queryParams.append('stage', stageS)

    this.permalinkURLAddress = '?' + queryParams.toString()
  }

  private computeInitialDate(): Date {
    const defaultDate = new Date()

    const tripDateTimeS = this.queryParams.get('trip_datetime') ?? null
    if (tripDateTimeS === null) {
      return defaultDate
    }

    const tripDateTime = new Date(Date.parse(tripDateTimeS))
    return tripDateTime
  }

  public getStageConfig(forStage: OJP.APP_Stage = this.currentAppStage): OJP.StageConfig {
    const stageConfig = APP_CONFIG.app_stages[forStage] ?? null

    if (stageConfig === null) {
      console.error('ERROR - cant find stage' + forStage + ' using PROD');
      return APP_CONFIG.app_stages['PROD']
    }
    
    return stageConfig
  }

  public updateAppStage(newStage: OJP.APP_Stage) {
    this.currentAppStage = newStage
    this.updatePermalinkAddress()
  }

  public updateDepartureDateTime(newDateTime: Date) {
    this.departureDate = newDateTime
    this.updatePermalinkAddress()
  }

  public updateTripMotType(motType: OJP.TripMotType, idx: number) {
    this.tripMotTypes[idx] = motType
    this.updatePermalinkAddress()
  }

  public updateParamsFromTrip(trip: OJP.Trip) {
    const hasLegs = trip.legs.length > 0
    if (!hasLegs) {
      return
    }

    const firstLeg = trip.legs[0]
    const lastLeg = trip.legs[trip.legs.length - 1]

    this.fromTripLocation = new OJP.TripLocationPoint(firstLeg.fromLocation)
    this.toTripLocation = new OJP.TripLocationPoint(lastLeg.toLocation)

    this.viaTripLocations = []
    
    this.journeyTripsPlaceholder = ['-'];
    this.tripModeTypes = ['monomodal'];
    this.tripTransportModes = ['public_transport'];
    
    this.geoLocationsUpdated.emit()
    this.updatePermalinkAddress()
  }
}
