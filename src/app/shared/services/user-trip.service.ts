import { EventEmitter, Injectable } from '@angular/core'

import { APP_CONFIG, APP_Stage } from 'src/app/config/app-config'
import { MapService } from './map.service'

import * as OJP from 'ojp-sdk'

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
  public currentAppStage: APP_Stage

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
  }

  public initDefaults() {
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

  public refetchEndpointsByName() {
    const promises: Promise<OJP.Location[] | null>[] = [];
    const emptyPromise = new Promise<null>((resolve, reject) => {
      resolve(null);
    });

    const endpointTypes: OJP.JourneyPointType[] = ['From', 'To']
    endpointTypes.forEach(endpointType => {
      const isFrom = endpointType === 'From'

      this.fromTripLocation?.location
      const tripLocation = isFrom ? this.fromTripLocation : this.toTripLocation;
      if (tripLocation === null) {
        promises.push(emptyPromise);
        return;
      }

      const locationName = tripLocation.location.computeLocationName();
      if (locationName === null) {
        promises.push(emptyPromise);
        return;
      }

      const geoPosition = tripLocation.location.geoPosition;
      if (geoPosition === null) {
        promises.push(emptyPromise);
        return;
      }

      // Search nearby locations, in a bbox of 200x200m
      const bbox = OJP.GeoPositionBBOX.initFromGeoPosition(geoPosition, 200, 200);
      const stageConfig = this.getStageConfig();
      const locationInformationRequest = OJP.LocationInformationRequest.initWithBBOXAndType(
        stageConfig,
        bbox.southWest.longitude,
        bbox.northEast.latitude,
        bbox.northEast.longitude,
        bbox.southWest.latitude,
        'stop',
        300
      );
      const locationInformationPromise = locationInformationRequest.fetchResponse();
      promises.push(locationInformationPromise)
    });

    Promise.all(promises).then(locationsData => {
      endpointTypes.forEach(endpointType => {
        const isFrom = endpointType === 'From'
        const locations = isFrom ? locationsData[0] : locationsData[1];
        if (locations === null) {
          return;
        }

        const tripLocation = isFrom ? this.fromTripLocation : this.toTripLocation;
        if (tripLocation === null) {
          promises.push(emptyPromise);
          return;
        }
        
        const nearbyLocation = tripLocation.location.findClosestLocation(locations);
        if (nearbyLocation === null) {
          return;
        }

        if (isFrom) {
          this.fromTripLocation = new OJP.TripLocationPoint(nearbyLocation.location)
        } else {
          this.toTripLocation = new OJP.TripLocationPoint(nearbyLocation.location)
        }

        this.updatePermalinkAddress();
        this.locationsUpdated.emit();
        this.geoLocationsUpdated.emit();
      })
    });
  }

  public switchEndpoints() {
    const locationAux = Object.assign({}, this.fromTripLocation);
    this.fromTripLocation = Object.assign({}, this.toTripLocation);
    this.toTripLocation = Object.assign({}, locationAux);

    this.updatePermalinkAddress();
    this.locationsUpdated.emit();
    this.geoLocationsUpdated.emit();
  }

  private computeAppStageFromString(appStageS: string): APP_Stage {
    const availableStages: APP_Stage[] = ['INT', 'LA Beta', 'PROD', 'TEST'];
    const availableStagesLower: string[] = availableStages.map(stage => {
      return stage.toLowerCase();
    });

    const appStage = appStageS.trim() as APP_Stage;
    const stageIDX = availableStagesLower.indexOf(appStage.toLowerCase());
    if (stageIDX !== -1) {
      return availableStages[stageIDX];
    }

    return 'PROD';
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

    this.permalinkURLAddress = 'search?' + queryParams.toString()
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

  public getStageConfig(forStage: APP_Stage = this.currentAppStage): OJP.StageConfig {
    const stageConfig = APP_CONFIG.app_stages[forStage] ?? null

    if (stageConfig === null) {
      console.error('ERROR - cant find stage' + forStage + ' using PROD');
      return APP_CONFIG.app_stages['PROD']
    }
    
    return stageConfig
  }

  public updateAppStage(newStage: APP_Stage) {
    this.currentAppStage = newStage
    this.updatePermalinkAddress()
  }

  public updateDepartureDateTime(newDateTime: Date) {
    this.departureDate = newDateTime
    this.updatePermalinkAddress()
  }

  public updateTripMode(tripModeType: OJP.TripModeType, tripTransportMode: OJP.IndividualTransportMode, tripSectionIdx: number) {
    this.tripModeTypes[tripSectionIdx] = tripModeType;
    this.tripTransportModes[tripSectionIdx] = tripTransportMode;

    this.updatePermalinkAddress()
  }

  private computeTripLocationsToUpdate(tripSectionIdx: number): OJP.TripLocationPoint[] {
    const tripLocationsToUpdate: OJP.TripLocationPoint[] = [];

    const tripLocations = [this.fromTripLocation];
    this.viaTripLocations.forEach(viaTripLocation => {
      tripLocations.push(viaTripLocation);
    });
    tripLocations.push(this.toTripLocation);

    const tripModeType = this.tripModeTypes[tripSectionIdx];
    
    const tripLocationPointA = tripLocations[tripSectionIdx];
    if (tripLocationPointA) {
      if (tripModeType === 'mode_at_start' || tripModeType === 'mode_at_start_end') {
        tripLocationsToUpdate.push(tripLocationPointA);
      }
    }

    const tripLocationPointB = tripLocations[tripSectionIdx + 1];
    if (tripLocationPointB) {
      if (tripModeType === 'mode_at_end' || tripModeType === 'mode_at_start_end') {
        tripLocationsToUpdate.push(tripLocationPointB);
      }
    }

    return tripLocationsToUpdate;
  }

  public updateTripLocationRestrictions(minDuration: number, maxDuration: number, minDistance: number, maxDistance: number, tripSectionIdx: number) {
    const tripLocationsToUpdate = this.computeTripLocationsToUpdate(tripSectionIdx);

    tripLocationsToUpdate.forEach(tripLocation => {
      tripLocation.minDuration = minDuration;
      tripLocation.maxDuration = maxDuration;
      tripLocation.minDistance = minDistance;
      tripLocation.maxDistance = maxDistance;
    });
  }

  public updateTripLocationCustomMode(tripSectionIdx: number) {
    const tripLocationsToUpdate = this.computeTripLocationsToUpdate(tripSectionIdx);
    const tripModeType = this.tripModeTypes[tripSectionIdx];

    tripLocationsToUpdate.forEach(tripLocation => {
      if (tripModeType === 'monomodal') {
        tripLocation.customTransportMode = null;
      } else {
        const tripTransportMode = this.tripTransportModes[tripSectionIdx];
        tripLocation.customTransportMode = tripTransportMode;
      }
    });
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
