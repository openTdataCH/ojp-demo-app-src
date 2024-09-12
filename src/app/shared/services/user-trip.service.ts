import { EventEmitter, Injectable } from '@angular/core'

import { APP_CONFIG, APP_STAGE, DEBUG_LEVEL } from '../../config/app-config'
import { MapService } from './map.service'

import * as OJP from 'ojp-sdk'
import mapboxgl from 'mapbox-gl'

type LocationUpdateSource = 'SearchForm' | 'MapDragend' | 'MapPopupClick'

@Injectable( {providedIn: 'root'} )
export class UserTripService {
  private queryParams: URLSearchParams

  public fromTripLocation: OJP.TripLocationPoint | null
  public toTripLocation: OJP.TripLocationPoint | null
  public viaTripLocations: OJP.TripLocationPoint[]
  public isViaEnabled: boolean

  public currentBoardingType: OJP.TripRequestBoardingType

  public tripModeTypes: OJP.TripModeType[]
  public tripTransportModes: OJP.IndividualTransportMode[]

  public journeyTripRequests: OJP.TripRequest[]
  public departureDate: Date
  public currentAppStage: APP_STAGE

  public permalinkRelativeURL: string | null
  public embedQueryParams = new URLSearchParams()

  public defaultsInited = new EventEmitter<void>();
  public locationsUpdated = new EventEmitter<void>();
  public geoLocationsUpdated = new EventEmitter<void>();
  public tripsUpdated = new EventEmitter<OJP.Trip[]>();
  
  public tripFaresUpdated = new EventEmitter<OJP.FareResult[]>();
  
  public activeTripSelected = new EventEmitter<OJP.Trip | null>();
  public tripRequestFinished = new EventEmitter<OJP.RequestInfo>();

  public searchParamsReset = new EventEmitter<void>();

  constructor(private mapService: MapService) {
    this.queryParams = new URLSearchParams(document.location.search)

    this.fromTripLocation = null
    this.toTripLocation = null
    this.viaTripLocations = []
    this.isViaEnabled = false;

    this.currentBoardingType = 'Dep'

    this.tripModeTypes = ['monomodal']
    this.tripTransportModes = ['public_transport']

    this.journeyTripRequests = [];
    
    this.departureDate = this.computeInitialDate()
    this.currentAppStage = 'PROD'

    this.permalinkRelativeURL = null
  }

  public initDefaults(language: OJP.Language) {
    let appStageS = this.queryParams.get('stage')
    if (appStageS) {
      this.currentAppStage = this.computeAppStageFromString(appStageS)
    }

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

    const stageConfig = this.getStageConfig();

    const endpointTypes: OJP.JourneyPointType[] = ['From', 'To']
    endpointTypes.forEach(endpointType => {
      const isFrom = endpointType === 'From'

      let stopPlaceRef = isFrom ? fromPlaceRef : toPlaceRef
      
      // LA Beta hack, strip everything before |
      if (this.currentAppStage === 'LA Beta') {
        const stopPlaceRefMatches = stopPlaceRef.match(/^[^\|]+?\|(.+?)$/);
        if (stopPlaceRefMatches) {
          stopPlaceRef = stopPlaceRefMatches[1];
        } else {
          console.error('ERROR LA Beta - CANT match stopPlaceRef');
        }
      }

      const coordsLocation = OJP.Location.initFromLiteralCoords(stopPlaceRef);

      if (coordsLocation) {
        const coordsPromise = new Promise<OJP.Location[]>((resolve) => {
          resolve([coordsLocation]);
        });
        promises.push(coordsPromise);
      } else {
        let locationInformationRequest = OJP.LocationInformationRequest.initWithStopPlaceRef(stageConfig, language, stopPlaceRef);
        // Check if is location name instead of stopId / sloid
        if (typeof stopPlaceRef === 'string' && /^[A-Z]/.test(stopPlaceRef)) {
          locationInformationRequest = OJP.LocationInformationRequest.initWithLocationName(stageConfig, language, stopPlaceRef, []);
        }

        const locationInformationPromise = locationInformationRequest.fetchLocations();
        promises.push(locationInformationPromise);
      }
    });

    const bbox = new OJP.GeoPositionBBOX([])

    const viaPartsS = this.queryParams.get('via') ?? null
    const viaParts: string[] = viaPartsS === null ? [] : viaPartsS.split(';')
    viaParts.forEach(viaKey => {
      const viaLocationFromCoords = OJP.Location.initFromLiteralCoords(viaKey);
      if (viaLocationFromCoords) {
        const viaTripLocation = new OJP.TripLocationPoint(viaLocationFromCoords);
        this.viaTripLocations.push(viaTripLocation);

        if (viaLocationFromCoords.geoPosition) {
          bbox.extend(viaLocationFromCoords.geoPosition);
        }
      } else {
        const stopPlaceLIR = OJP.LocationInformationRequest.initWithStopPlaceRef(stageConfig, language, viaKey);
        const stopPlacePromise = stopPlaceLIR.fetchLocations();
        promises.push(stopPlacePromise);
      }
    });
    
    this.tripModeTypes = [];
    const tripModeTypesS = this.queryParams.get('mode_types') ?? null;
    if (tripModeTypesS) {
      tripModeTypesS.split(';').forEach(tripModeTypeS => {
        this.tripModeTypes.push(tripModeTypeS as OJP.TripModeType);
      });
    } else {
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

    Promise.all(promises).then(locationsData => {
      endpointTypes.forEach(endpointType => {
        const isFrom = endpointType === 'From'
        const locations = isFrom ? locationsData[0] : locationsData[1];
        if (locations.length === 0) {
          return;
        }

        const firstLocation = locations[0]
        if (isFrom) {
          this.fromTripLocation = new OJP.TripLocationPoint(firstLocation);
        } else {
          this.toTripLocation = new OJP.TripLocationPoint(firstLocation);
        }

        if (firstLocation.geoPosition) {
          bbox.extend(firstLocation.geoPosition)
        }
      });

      const viaLocationsData = locationsData[2] ?? null;
      if (viaLocationsData !== null) {
        this.isViaEnabled = true;
        
        const firstLocation = viaLocationsData[0];
        const viaTripLocation = new OJP.TripLocationPoint(firstLocation);
        this.viaTripLocations = [viaTripLocation];

        if (firstLocation.geoPosition) {
          bbox.extend(firstLocation.geoPosition)
        }
      }

      this.locationsUpdated.emit();
      this.geoLocationsUpdated.emit();
      this.updatePermalinkAddress();

      if (bbox.isValid()) {
        const shouldZoomToBounds = this.queryParams.has('from') || this.queryParams.has('to')
        if (shouldZoomToBounds && !this.mapService.initialMapCenter) {
          const bounds = new mapboxgl.LngLatBounds(bbox.asFeatureBBOX())
          const mapData = {
            bounds: bounds
          }
          this.mapService.newMapBoundsRequested.emit(mapData);
        }
      }
      
      this.defaultsInited.emit();
    });
  }

  public refetchEndpointsByName(language: OJP.Language) {
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
        language,
        bbox.southWest.longitude,
        bbox.northEast.latitude,
        bbox.northEast.longitude,
        bbox.southWest.latitude,
        ['stop'],
        300
      );
      const locationInformationPromise = locationInformationRequest.fetchLocations();
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

    this.locationsUpdated.emit();
    this.geoLocationsUpdated.emit();
    this.activeTripSelected.emit(null);

    this.searchParamsReset.emit();
    this.updatePermalinkAddress();
  }

  public updateVia() {
    this.isViaEnabled = !this.isViaEnabled;

    this.locationsUpdated.emit();
    this.geoLocationsUpdated.emit();
    this.activeTripSelected.emit(null);

    this.searchParamsReset.emit();
    this.updatePermalinkAddress();
  }

  private computeAppStageFromString(appStageS: string): APP_STAGE {
    const availableStages: APP_STAGE[] = APP_CONFIG.app_stages.map((stage) => {
      return stage.key as APP_STAGE;
    });
    const availableStagesLower: string[] = availableStages.map(stage => {
      return stage.toLowerCase();
    });

    const appStage = appStageS.trim() as APP_STAGE;
    const stageIDX = availableStagesLower.indexOf(appStage.toLowerCase());
    if (stageIDX !== -1) {
      return availableStages[stageIDX];
    }

    return 'PROD';
  }

  updateTripEndpoint(location: OJP.Location | null, endpointType: OJP.JourneyPointType, updateSource: LocationUpdateSource) {
    if (endpointType === 'From') {
      if (location) {
        this.fromTripLocation = new OJP.TripLocationPoint(location)
      } else {
        this.fromTripLocation = null
      }
    }
    if (endpointType === 'To') {
      if (location) {
        this.toTripLocation = new OJP.TripLocationPoint(location)
      } else {
        this.toTripLocation = null
      }
    }

    if (location && endpointType === 'Via') {
      const viaTripLocation = new OJP.TripLocationPoint(location);
      this.viaTripLocations = [viaTripLocation];

      this.isViaEnabled = true;
    }

    this.locationsUpdated.emit();
    this.geoLocationsUpdated.emit();
    this.activeTripSelected.emit(null);

    this.searchParamsReset.emit();
    this.updatePermalinkAddress();
  }

  updateViaPoint(location: OJP.Location, viaIDx: number) {
    this.viaTripLocations[viaIDx].location = location;

    this.locationsUpdated.emit();
    this.geoLocationsUpdated.emit();
    this.activeTripSelected.emit(null);

    this.searchParamsReset.emit();
    this.updatePermalinkAddress();
  }

  updateTrips(trips: OJP.Trip[]) {
    this.massageTrips(trips);
    this.tripsUpdated.emit(trips);
  }

  selectActiveTrip(trip: OJP.Trip | null) {
    this.activeTripSelected.emit(trip);
  }

  private updateFares(fareResults: OJP.FareResult[]) {
    this.tripFaresUpdated.emit(fareResults);
  }

  public computeTripRequestXML(language: OJP.Language, departureDate: Date): string {
    const stageConfig = this.getStageConfig();
    const request = OJP.TripRequest.initWithTripLocationsAndDate(stageConfig, language, this.fromTripLocation, this.toTripLocation, departureDate);
    if (request === null || request.requestInfo.requestXML === null) {
      return 'BROKEN TripsRequestParams';
    }

    return request.requestInfo.requestXML;
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
        let geoPositionLngLatS = tripLocationPoint?.location.geoPosition?.asLatLngString(true) ?? null
        if (geoPositionLngLatS) {
          const includeLiteralCoords = false;
          const locationName = tripLocationPoint?.location.computeLocationName(includeLiteralCoords);
          if (locationName) {
            geoPositionLngLatS = geoPositionLngLatS + '(' + locationName + ')'
          }

          queryParams.append(queryParamKey, geoPositionLngLatS)
        }
      }
    })

    const viaParamParts: string[] = []
    this.viaTripLocations.forEach(viaTripLocation => {
      const location = viaTripLocation.location;
      if (location.stopPlace) {
        viaParamParts.push(location.stopPlace.stopPlaceRef);
      } else {
        const geoPositionLngLatS = location?.geoPosition?.asLatLngString(true) ?? null
        if (geoPositionLngLatS) {
          viaParamParts.push(geoPositionLngLatS);
        }
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

    this.permalinkRelativeURL = document.location.pathname.replace('/embed', '') + '?' + queryParams.toString();

    const embedQueryParams = new URLSearchParams();
    const keepKeys = ['from', 'to'];
    keepKeys.forEach(key => {
      const value = queryParams.get(key);
      if (value !== null) {
        embedQueryParams.append(key, value);
      }
    })

    this.embedQueryParams = embedQueryParams;
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

  public getStageConfig(forStage: APP_STAGE = this.currentAppStage): OJP.StageConfig {
    const stageConfig = APP_CONFIG.app_stages.find(stage => {
      return stage.key === forStage
    }) ?? null;

    if (stageConfig === null) {
      console.error('ERROR - cant find stage' + forStage + ' using PROD');
      return OJP.DEFAULT_STAGE;
    }
    
    return stageConfig
  }

  public updateAppStage(newStage: APP_STAGE) {
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
    
    this.tripModeTypes = ['monomodal'];
    this.tripTransportModes = ['public_transport'];
    
    this.geoLocationsUpdated.emit()
    this.updatePermalinkAddress()
  }

  public massageTrips(trips: OJP.Trip[]) {
    this.sortTrips(trips);
    this.patchTripLegEndpointCoords(trips);
    this.mergeTripLegs(trips);
  }

  private sortTrips(trips: OJP.Trip[]) {
    const tripModeTypes = this.tripModeTypes;
    const tripTransportModes = this.tripTransportModes;
    if (!((tripModeTypes.length === 1) && (tripTransportModes.length === 1))) {
      // ignore multi-trips journeys
      return;
    }

    const tripModeType = tripModeTypes[0];
    const transportMode = tripTransportModes[0];

    if (tripModeType !== 'monomodal') {
      return;
    }

    if (transportMode === 'public_transport') {
      return;
    }

    // Push first the monomodal trip with one leg matching the transport mode
    const monomodalTrip = trips.find(trip => {
      const foundLeg = trip.legs.find(leg => {
        if (leg.legType !== 'ContinousLeg') {
          return false;
        }

        const continousLeg = trip.legs[0] as OJP.TripContinousLeg;
        return continousLeg.legTransportMode === transportMode;
      }) ?? null;

      return foundLeg !== null;
    }) ?? null;

    if (monomodalTrip) {
      const tripIdx = trips.indexOf(monomodalTrip);
      trips.splice(tripIdx, 1);
      trips.unshift(monomodalTrip);

      if (DEBUG_LEVEL === 'DEBUG') {
        console.log('SDK HACK - sortTrips - trips were re-sorted to promote the index-' + tripIdx + ' trip first');
      }
    }
  }

  private patchTripLegEndpointCoords(trips: OJP.Trip[]) {
    trips.forEach(trip => {
      trip.legs.forEach((leg, legIdx) => {
        if (leg.legType !== 'TimedLeg') {
          return;
        }
  
        const timedLeg = leg as OJP.TripTimedLeg;
        
        // Check if we have a START geoPosition
        // - use it for prev leg END geoPosition
        const fromGeoPosition = timedLeg.legTrack?.fromGeoPosition() ?? null;
        if (legIdx > 0 && fromGeoPosition !== null) {
          const prevLeg = trip.legs[legIdx - 1];
          if (prevLeg.toLocation.geoPosition === null) {
            if (DEBUG_LEVEL === 'DEBUG') {
              console.log('SDK HACK - patchLegEndpointCoords - use legTrack.fromGeoPosition for prevLeg.toLocation.geoPosition');
            }
            prevLeg.toLocation.geoPosition = fromGeoPosition;
          }
        }
  
        // Check if we have a END geoPosition
        // - use it for next leg START geoPosition
        const toGeoPosition = timedLeg.legTrack?.toGeoPosition() ?? null;
        if (legIdx < (trip.legs.length - 1) && toGeoPosition !== null) {
          const nextLeg = trip.legs[legIdx + 1];
          if (nextLeg.fromLocation.geoPosition === null) {
            if (DEBUG_LEVEL === 'DEBUG') {
              console.log('SDK HACK - patchLegEndpointCoords - use legTrack.toGeoPosition for nextLeg.fromLocation.geoPosition');
            }
            nextLeg.fromLocation.geoPosition = toGeoPosition;
          }
        }
      });
    });
  }
    
  // Some of the legs can be merged
  // ex1: trains with multiple desitinaion units
  // - check for remainInVehicle https://github.com/openTdataCH/ojp-demo-app-src/issues/125  
  private mergeTripLegs(trips: OJP.Trip[]) {
    trips.forEach(trip => {
      const newLegs: OJP.TripLeg[] = [];
      let skipIdx: number = -1;
      
      trip.legs.forEach((leg, legIdx) => {
        if (legIdx <= skipIdx) {
          return;
        }

        const leg2Idx = legIdx + 1;
        const leg3Idx = legIdx + 2;
        if (leg3Idx >= trip.legs.length) {
          newLegs.push(leg);
          return;
        }

        // If TransferLeg of type 'remainInVehicle'
        // => merge prev / next TimedLeg legs
        let shouldMergeLegs = false;
        const leg2 = trip.legs[leg2Idx];
        const leg3 = trip.legs[leg3Idx];
        if (leg.legType === 'TimedLeg' && leg2.legType === 'TransferLeg' && leg3.legType === 'TimedLeg') {
          const continousLeg = leg2 as OJP.TripContinousLeg;
          if (continousLeg.transferMode === 'remainInVehicle') {
            shouldMergeLegs = true;
            skipIdx = leg3Idx;
          }
        }

        if (shouldMergeLegs) {
          const newLeg = this.mergeTimedLegs(leg as OJP.TripTimedLeg, leg3 as OJP.TripTimedLeg);
          newLegs.push(newLeg);
        } else {
          newLegs.push(leg);
        }
      });

      if (trip.legs.length > 0 && (trip.legs.length !== newLegs.length)) {
        if (DEBUG_LEVEL === 'DEBUG') {
          console.log('SDK HACK - mergeTripLegs - remainInVehicle usecase, before: ' + trip.legs.length + ', after: ' + newLegs.length + ' legs');
        }
        trip.legs = newLegs;
      }
    });
  }

  private mergeTimedLegs(leg1: OJP.TripTimedLeg, leg2: OJP.TripTimedLeg) {
    let newLegIntermediatePoints = leg1.intermediateStopPoints.slice();
    leg1.toStopPoint.stopPointType = 'Intermediate';
    newLegIntermediatePoints.push(leg1.toStopPoint);
    newLegIntermediatePoints = newLegIntermediatePoints.concat(leg2.intermediateStopPoints.slice());

    const newLeg = new OJP.TripTimedLeg(leg1.legID, leg1.service, leg1.fromStopPoint, leg2.toStopPoint, newLegIntermediatePoints);

    if (leg1.legDuration !== null && leg2.legDuration !== null) {
      newLeg.legDuration = leg1.legDuration.plus(leg2.legDuration);
    }

    if (leg1.legTrack !== null && leg2.legTrack !== null) {
      newLeg.legTrack = leg1.legTrack.plus(leg2.legTrack);
    }
    
    return newLeg;
  }

  public fetchFares() {
    if (this.journeyTripRequests.length === 0) {
      return;
    }

    const tripRequestResponse = this.journeyTripRequests[0].response;
    if (tripRequestResponse === null) {
      return;
    }

    const tripRequestResponseRebuilt = new OJP.TripRequestResponse(tripRequestResponse.trips);
    const tripRequestResponseXML = tripRequestResponseRebuilt.asXML();

    const novaURL = 'https://tools.odpch.ch/ojp-nova/ojp2023';
    const novaHTTP = fetch(novaURL, {
      body: tripRequestResponseXML,
      method: 'POST'
    });
    novaHTTP.then(response => {
      response.text().then(novaResponseXML => {
        const parser = new OJP.NovaFareParser();
        parser.callback = (response) => {
          if (response.message === 'NovaFares.DONE') {
            this.updateFares(response.fareResults);
          } else {
            console.error('NOVA ERROR');
            console.log(novaResponseXML);
          }
        };
        parser.parseXML(novaResponseXML);
      });
    });
  }
}
