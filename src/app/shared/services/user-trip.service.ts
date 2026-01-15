import { EventEmitter, Injectable } from '@angular/core'
import { BehaviorSubject, Observable } from 'rxjs';

import mapboxgl from 'mapbox-gl';

import * as OJP_Types from 'ojp-shared-types';
import * as OJP_Next from 'ojp-sdk-next';

import OJP_Legacy from '../../config/ojp-legacy';

import { APP_CONFIG } from '../../config/app-config';
import { APP_STAGE, DEFAULT_APP_STAGE, REQUESTOR_REF, TRIP_REQUEST_DEFAULT_NUMBER_OF_RESULTS, OJP_VERSION } from '../../config/constants';

import { MapService } from './map.service';
import { TripData, TripLegData } from '../types/trip';
import { AnyPlace, PlaceBuilder, sortPlaces } from '../models/place/place-builder';
import { PlaceLocation } from '../models/place/location';
import { GeoPositionBBOX } from '../models/geo/geoposition-bbox';
import { OJPHelpers } from '../../helpers/ojp-helpers';
import { AnyLocationInformationRequestResponse } from '../types/_all';
import { IndividualTransportMode } from '../types/transport-mode';
import { TripPlace } from '../models/trip-place';
import { StopPlace } from '../models/place/stop-place';

type LocationUpdateSource = 'SearchForm' | 'MapDragend' | 'MapPopupClick';

@Injectable( {providedIn: 'root'} )
export class UserTripService {
  private queryParams: URLSearchParams

  public fromTripLocation: TripPlace | null;
  public toTripLocation: TripPlace | null;
  public viaTripLocations: TripPlace[];
  public isViaEnabled: boolean;

  public isAdditionalRestrictionsEnabled: boolean;
  
  public numberOfResults: number | null;
  public numberOfResultsBefore: number | null;
  public numberOfResultsAfter: number | null;
  public publicTransportModesFilter: OJP_Legacy.ModeOfTransportType[];
  public railSubmodesFilter: string[];
  public useRealTimeDataType: OJP_Types.UseRealtimeDataEnum;
  public walkSpeedDeviation: number | null;

  public currentBoardingType: OJP_Legacy.TripRequestBoardingType;

  public tripModeType: OJP_Legacy.TripModeType;
  public tripTransportMode: IndividualTransportMode;

  public journeyTripRequests: OJP_Legacy.TripRequest[];
  public departureDate: Date;
  public currentAppStage: APP_STAGE;

  public permalinkRelativeURL: string | null;
  public otherVersionURL: string | null;
  public otherVersionURLText: string | null;
  public sbbURL: string | null;
  public embedQueryParams = new URLSearchParams();

  public searchFormAfterDefaultsInited = new EventEmitter<void>();
  
  // TODO - migrate to use this.userTripService.locationChanges
  public locationsUpdated = new EventEmitter<void>();
  
  public tripsDataUpdated = new EventEmitter<TripData[]>();
  
  public tripFaresUpdated = new EventEmitter<OJP_Types.FareResultSchema[]>();
  
  public mapActiveTripSelected = new EventEmitter<TripData | null>();
  public tripRequestFinished = new EventEmitter<OJP_Legacy.RequestInfo>();

  public searchParamsReset = new EventEmitter<void>();

  public stageChanged = new EventEmitter<APP_STAGE>();

  private readonly _initialLocationsChanges = new BehaviorSubject<boolean | null>(null);
  readonly initialLocationsChanges$: Observable<boolean | null> = this._initialLocationsChanges.asObservable();

  constructor(private mapService: MapService) {
    this.queryParams = new URLSearchParams(document.location.search);

    this.fromTripLocation = null;
    this.toTripLocation = null;
    this.viaTripLocations = [];
    
    this.numberOfResults = TRIP_REQUEST_DEFAULT_NUMBER_OF_RESULTS;
    this.numberOfResultsBefore = null;
    this.numberOfResultsAfter = null;
    this.publicTransportModesFilter = [];
    this.railSubmodesFilter = [];
    this.useRealTimeDataType = 'explanatory';
    this.walkSpeedDeviation = null;
    
    this.isViaEnabled = false;
    this.isAdditionalRestrictionsEnabled = false;

    this.currentBoardingType = 'Dep';

    this.tripModeType = 'monomodal';
    this.tripTransportMode = 'public_transport';

    this.journeyTripRequests = [];
    
    this.departureDate = this.computeInitialDate()
    this.currentAppStage = DEFAULT_APP_STAGE;

    this.permalinkRelativeURL = null;
    this.otherVersionURL = null;
    this.otherVersionURLText = null;
    this.sbbURL = null;
  }

  public async initDefaults(language: OJP_Legacy.Language): Promise<void> {
    const appStage = OJPHelpers.computeAppStage();

    setTimeout(() => {
      // HACK 
      // without the setTimeout , the parent src/app/journey/journey-search/journey-search.component.html template 
      // gives following errors core.mjs:9157 ERROR RuntimeError: NG0100: ExpressionChangedAfterItHasBeenCheckedError: 
      // Expression has changed after it was checked. Previous value: 'PROD'. Current value: 'INT'. 
      // Find more at https://angular.io/errors/NG0100
      this.currentAppStage = appStage;
    });

    this.updateAppStage(appStage);

    const defaultLocationsPlaceRef = {
      "Bern": "8507000",
      "Geneva": "8501008",
      "Gurten": "8507099",
      "St. Gallen": "8506302",
      "Uetliberg": "8503057",
      "Zurich": "8503000",
      "_DemandLegFrom": "46.674360,6.460966",
      "_DemandLegTo": "46.310963,7.977509",
    }

    const fromPlaceName = 'Bern';
    const toPlaceName = 'Zurich';
    const fromPlaceRef = this.queryParams.get('from') ?? defaultLocationsPlaceRef[fromPlaceName];
    const toPlaceRef = this.queryParams.get('to') ?? defaultLocationsPlaceRef[toPlaceName];

    const ojpSDK_Next = this.createOJP_SDK_Instance(language, appStage);

    const endpointTypes: OJP_Legacy.JourneyPointType[] = ['From', 'To'];
    for (const endpointType of endpointTypes) {
      const isFrom = endpointType === 'From';

      let stopPlaceRef = isFrom ? fromPlaceRef : toPlaceRef;
      
      // OJP-SI cant handle StopRefs
      if (appStage === 'OJP-SI') {
        stopPlaceRef = isFrom ? fromPlaceName : toPlaceName;
      }
      
      // LA Beta hack, strip everything before |
      if (appStage === 'LA Beta') {
        const stopPlaceRefMatches = stopPlaceRef.match(/^[^\|]+?\|(.+?)$/);
        if (stopPlaceRefMatches) {
          stopPlaceRef = stopPlaceRefMatches[1];
        } else {
          console.error('ERROR LA Beta - CANT match stopPlaceRef');
        }
      }

      let place: AnyPlace | null = null;

      const coordsPlace = PlaceLocation.initFromLiteralCoords(stopPlaceRef);
      if (coordsPlace) {
        place = coordsPlace;
      } else {
        let request = ojpSDK_Next.requests.LocationInformationRequest.initWithPlaceRef(stopPlaceRef, 10);
        // Check if is location name instead of stopId / sloid
        if (typeof stopPlaceRef === 'string' && /^[A-Z]/.test(stopPlaceRef)) {
          request = ojpSDK_Next.requests.LocationInformationRequest.initWithLocationName(stopPlaceRef, ['stop'], 10);
        }
        const response = await request.fetchResponse(ojpSDK_Next);

        place = this.parsePlace(response);
      }

      if (!place) {
        continue;
      }

      if (isFrom) {
        this.fromTripLocation = TripPlace.initWithPlace(place);
      } else {
        this.toTripLocation = TripPlace.initWithPlace(place);
      }
    };

    this.viaTripLocations = [];

    const viaPartsS = this.queryParams.get('via') ?? null;
    const viaParts: string[] = viaPartsS === null ? [] : viaPartsS.split(';');
    for (const viaKey of viaParts) {
      let place: AnyPlace | null = null;

      const coordsPlace = PlaceLocation.initFromLiteralCoords(viaKey);
      if (coordsPlace) {
        place = coordsPlace;
      } else {
        const request = ojpSDK_Next.requests.LocationInformationRequest.initWithPlaceRef(viaKey, 10);
        const response = await request.fetchResponse(ojpSDK_Next);
        place = this.parsePlace(response);
      }

      if (!place) {
        continue;
      }

      this.isViaEnabled = true;
      
      const viaTripLocation = TripPlace.initWithPlace(place);
      this.viaTripLocations.push(viaTripLocation);
    };
    
    this.tripModeType = 'monomodal';
    const tripModeTypesS = this.queryParams.get('mode_types') ?? null;
    if (tripModeTypesS !== null) {
      this.tripModeType = tripModeTypesS.split(';')[0] as OJP_Legacy.TripModeType;
    }

    this.tripTransportMode = 'public_transport';
    const tripTransportModesS = this.queryParams.get('transport_modes') ?? null;
    if (tripTransportModesS !== null) {
      this.tripTransportMode = tripTransportModesS.split(';')[0] as IndividualTransportMode;
    }

    this.publicTransportModesFilter = (() => {
      const modes: OJP_Legacy.ModeOfTransportType[] = [];

      const publicTransportModesS = this.queryParams.get('public_transport_modes') ?? null;
      if (publicTransportModesS === null) {
        return modes;
      }

      const userPublicTransportModes = publicTransportModesS.split(',').map(el => el.toLowerCase().trim());
      userPublicTransportModes.forEach(userPublicTransportMode => {
        if (userPublicTransportMode === 'bus') {
          modes.push('bus');
        }
        if (['ship', 'water'].includes(userPublicTransportMode)) {
          modes.push('water');
        }
        if (['rail', 'train'].includes(userPublicTransportMode)) {
          modes.push('rail');
        }
      });
      
      return modes;
    })();

    this.railSubmodesFilter = (() => {
      const modes: string[] = [];

      const railSubmodesS = this.queryParams.get('rail_submodes') ?? null;
      if (railSubmodesS === null) {
        return modes;
      }

      const userRailSubmodes = railSubmodesS.split(',').map(el => el.toLowerCase().trim());
      return userRailSubmodes;
    })();

    this.locationsUpdated.emit();
    this.updateURLs();

    this.isAdditionalRestrictionsEnabled = ['yes', 'true', '1'].includes(this.queryParams.get('advanced') ?? 'n/a');

    this.currentBoardingType = (() => {
      const userTimeTypeS = this.queryParams.get('time_type') ?? null;
      if (userTimeTypeS === null) {
        return 'Dep';
      }

      if (['arrival', 'arr'].includes(userTimeTypeS.toLowerCase())) {
        return 'Arr';
      }

      return 'Dep' as OJP_Legacy.TripRequestBoardingType;
    })();

    this._initialLocationsChanges.next(true);
  }

  private parsePlace(response: AnyLocationInformationRequestResponse): AnyPlace | null {
    if (!response.ok) {
      console.log('ERROR - fetchPlace.LIR - issue');
      console.log(response);
      return null;
    }

    const placeResults = OJPHelpers.parseAnyPlaceResult(OJP_VERSION, response);
    if (placeResults.length === 0) {
      return null;
    }

    const place = PlaceBuilder.initWithPlaceResultSchema(OJP_VERSION, placeResults[0]);
    return place;
  }

  public async refetchEndpointsByName(language: OJP_Legacy.Language) {
    const ojpSDK_Next = this.createOJP_SDK_Instance(language);

    const endpointTypes: OJP_Legacy.JourneyPointType[] = ['From', 'To'];
    for (const endpointType of endpointTypes) {
      const isFrom = endpointType === 'From';

      const tripLocation = isFrom ? this.fromTripLocation : this.toTripLocation;
      if (tripLocation === null) {
        continue;
      }

      const tripPlaceLocation = tripLocation.place;

      // Search nearby locations, in a bbox of 200x200m
      const bbox = GeoPositionBBOX.initFromGeoPosition(tripPlaceLocation.geoPosition, 200, 200);
      const bboxData = bbox.asFeatureBBOX();
      const request = ojpSDK_Next.requests.LocationInformationRequest.initWithBBOX(bboxData, ['stop'], 300);

      const response = await request.fetchResponse(ojpSDK_Next);

      if (!response.ok) {
          console.log('ERROR - failed to bbox lookup locations for "' + bboxData.join(', ') + '"');
          console.log(response);
          continue;
      }

      const placeResults = OJPHelpers.parseAnyPlaceResult(OJP_VERSION, response);

      const places = placeResults.map(placeResult => {
        const place = PlaceBuilder.initWithPlaceResultSchema(OJP_VERSION, placeResult);
        return place;
      }).filter(Boolean) as AnyPlace[];
      
      if (places.length === 0) {
        continue;
      }

      const sortedPlaces = sortPlaces(places, tripPlaceLocation);
      const nearbyPlace = sortedPlaces[0];
      if (isFrom) {
        this.fromTripLocation = TripPlace.initWithPlace(nearbyPlace);
      } else {
        this.toTripLocation = TripPlace.initWithPlace(nearbyPlace);
      }
    };

    this.updateURLs();
    this.locationsUpdated.emit();
  }

  public switchEndpoints() {
    const locationAux = Object.assign({}, this.fromTripLocation);
    this.fromTripLocation = Object.assign({}, this.toTripLocation);
    this.toTripLocation = Object.assign({}, locationAux);

    this.locationsUpdated.emit();
    this.mapActiveTripSelected.emit(null);

    this.searchParamsReset.emit();
    this.updateURLs();
  }

  public updateVia() {
    this.isViaEnabled = !this.isViaEnabled;

    this.locationsUpdated.emit();
    this.mapActiveTripSelected.emit(null);

    this.searchParamsReset.emit();
    this.updateURLs();
  }

  updateTripEndpoint(place: AnyPlace, endpointType: OJP_Legacy.JourneyPointType, updateSource: LocationUpdateSource) {
    if (endpointType === 'From') {
      if (this.fromTripLocation) {
        this.fromTripLocation = this.patchTripLocationPoint(this.fromTripLocation, place);
      }
    }
    if (endpointType === 'To') {
      if (this.toTripLocation) {
        this.toTripLocation = this.patchTripLocationPoint(this.toTripLocation, place);
      }
    }

    if (location && endpointType === 'Via') {
      const viaTripLocation = TripPlace.initWithPlace(place);
      this.viaTripLocations = [viaTripLocation];

      this.isViaEnabled = true;
    }

    this.locationsUpdated.emit();
    this.mapActiveTripSelected.emit(null);

    this.searchParamsReset.emit();
    this.updateURLs();
  }

  private patchTripLocationPoint(tripLocation: TripPlace, place: AnyPlace) {
    const customTransportMode = tripLocation.customTransportMode ?? null;
    const minDistance = tripLocation.minDistance ?? null;
    const maxDistance = tripLocation.maxDistance ?? null;
    const minDuration = tripLocation.minDuration ?? null;
    const maxDuration = tripLocation.maxDuration ?? null;

    const newTripLocation = TripPlace.initWithPlace(place);
    newTripLocation.customTransportMode = customTransportMode;
    newTripLocation.minDistance = minDistance;
    newTripLocation.maxDistance = maxDistance;
    newTripLocation.minDuration = minDuration;
    newTripLocation.maxDuration = maxDuration;

    return newTripLocation;
  }

  updateViaPoint(place: AnyPlace, viaIDx: number) {
    this.viaTripLocations[viaIDx].place = place;

    this.locationsUpdated.emit();
    this.mapActiveTripSelected.emit(null);

    this.searchParamsReset.emit();
    this.updateURLs();
  }

  updateTrips(trips: OJP_Legacy.Trip[]) {
    const tripsData = OJPHelpers.convertTripsToTripData(trips);
    this.tripsDataUpdated.emit(tripsData);
  }

  private updateFares(fareResults: OJP_Types.FareResultSchema[]) {
    this.tripFaresUpdated.emit(fareResults);
  }

  public updateURLs() {
    const queryParams = new URLSearchParams();

    const endpointTypes: OJP_Legacy.JourneyPointType[] = ['From', 'To'];
    endpointTypes.forEach(endpointType => {
      const tripLocationPoint = endpointType === 'From' ? this.fromTripLocation : this.toTripLocation;
      const place = tripLocationPoint?.place ?? null;
      if (place === null) {
        return;
      }

      const queryParamKey = endpointType.toLowerCase();

      const stopPlaceRef: string | null = (() => {
        if (place.type === 'stop') {
          const stopPlace = place as StopPlace;
          return stopPlace.stopRef;
        }

        return null;
      })();

      if (stopPlaceRef) {
        queryParams.append(queryParamKey, stopPlaceRef);
      } else {
        const placeName = place.computeName();
        const placeCoordsWithName = place.geoPosition.asLatLngString(true) + '(' + placeName + ')';
        queryParams.append(queryParamKey, placeCoordsWithName);
      }
    });

    const viaParamParts: string[] = []
    this.viaTripLocations.forEach(viaTripLocation => {
      const place = viaTripLocation.place;
      if (place.type === 'stop') {
        const stopPlace = place as StopPlace;
        viaParamParts.push(stopPlace.stopRef);
      } else {
        const geoPositionLngLatS = place.geoPosition.asLatLngString(true);
        viaParamParts.push(geoPositionLngLatS);
      }
    });
    if (viaParamParts.length > 0) {
      queryParams.append('via', viaParamParts.join(';'));
    }
    
    if (this.tripModeType !== 'monomodal') {
      queryParams.append('mode_types', this.tripModeType);
    }
    
    if (this.tripTransportMode !== 'public_transport') {
      queryParams.append('transport_modes', this.tripTransportMode);
    }

    if (this.publicTransportModesFilter.length > 0) {
      queryParams.append('public_transport_modes', this.publicTransportModesFilter.join(','));
    }

    if (this.railSubmodesFilter.length > 0) {
      queryParams.append('rail_submodes', this.railSubmodesFilter.join(','));
    }

    const now = new Date();
    const deltaNowMinutes = Math.abs((now.getTime() - this.departureDate.getTime()) / 1000 / 60);
    if (deltaNowMinutes > 5) {
      const dateTimeS = OJP_Next.DateHelpers.formatDate(this.departureDate);
      queryParams.append('trip_datetime', dateTimeS.substring(0, 16));
    }

    if (this.currentAppStage !== DEFAULT_APP_STAGE) {
      const stageS = this.currentAppStage.toLowerCase();
      queryParams.append('stage', stageS)
    }

    if (this.isAdditionalRestrictionsEnabled) {
      queryParams.append('advanced', 'yes');

      if (this.fromTripLocation?.minDistance !== null) {
        queryParams.append('minDistance', String(this.fromTripLocation?.minDistance));
      }
      if (this.fromTripLocation?.maxDistance !== null) {
        queryParams.append('maxDistance', String(this.fromTripLocation?.maxDistance));
      }
      if (this.fromTripLocation?.minDuration !== null) {
        queryParams.append('minDuration', String(this.fromTripLocation?.minDuration));
      }
      if (this.fromTripLocation?.maxDuration !== null) {
        queryParams.append('maxDuration', String(this.fromTripLocation?.maxDuration));
      }
    }

    const permalinkQueryParams = new URLSearchParams(queryParams);
    const currentQueryParams = new URLSearchParams(document.location.search);
    const userVersion = currentQueryParams.get('v');
    if (userVersion) {
      permalinkQueryParams.append('v', userVersion);
    }
    this.permalinkRelativeURL = document.location.pathname.replace('/embed', '') + '?' + permalinkQueryParams.toString();
    
    this.updateLinkedURLs(queryParams);

    const embedQueryParams = new URLSearchParams();
    const keepKeys = ['from', 'to'];
    keepKeys.forEach(key => {
      const value = queryParams.get(key);
      if (value !== null) {
        embedQueryParams.append(key, value);
      }
    });

    this.embedQueryParams = embedQueryParams;
  }

  private updateLinkedURLs(queryParams: URLSearchParams) {
    const isOJPv2 = OJP_VERSION === '2.0';

    const otherVersionQueryParams = new URLSearchParams(queryParams);
    this.updateStageLinkedURL(otherVersionQueryParams, isOJPv2);
    if (isOJPv2) {
      // v1
      this.otherVersionURL = 'https://tools.odpch.ch/beta-ojp-demo/search?' + otherVersionQueryParams.toString();
      this.otherVersionURLText = 'BETA (OJP 1.0)';
    } else {
      // v2
      this.otherVersionURL = 'https://opentdatach.github.io/ojp-demo-app/search?' + otherVersionQueryParams.toString();
      this.otherVersionURLText = 'PROD (OJP 2.0)';
    }

    const sbbURLStopsData: {[key: string]: string}[] = [];
    const stopKeys = ['from', 'to'];
    stopKeys.forEach(key => {
      const value = queryParams.get(key);
      if (value === null) {
        return;
      }
      const label: string = (() => {
        const defaultLabel = key.charAt(0).toUpperCase() + key.slice(1) + ' placeholder';

        const isFrom = key === 'from';
        const tripPoint = isFrom ? this.fromTripLocation : this.toTripLocation;
        if (tripPoint === null) {
          return defaultLabel;
        }
        const label = tripPoint.place.computeName();

        return label + ' (OJP Demo)';
      })();
      
      const stopData = {
        "value": value,
        "type": "ID",
        "label": label,
      };
      sbbURLStopsData.push(stopData);
    });
    const sbbURLQueryParams = new URLSearchParams();
    sbbURLQueryParams.set('stops', JSON.stringify(sbbURLStopsData));
    sbbURLQueryParams.set('ref', 'OJP Demo');
    this.sbbURL = 'https://www.sbb.ch/en?' + sbbURLQueryParams.toString();
  }

  public updateStageLinkedURL(queryParams: URLSearchParams, isOJPv2: boolean) {
    const newStage: APP_STAGE | null = (() => {
      if (isOJPv2) {
        // target beta is OJPv1
        if (this.currentAppStage === 'V2-INT') {
          return 'INT';
        }
        if (this.currentAppStage === 'V2-TEST') {
          return 'TEST';
        }
      } else {
        // target beta is OJPv2
        if (this.currentAppStage === 'INT') {
          return 'V2-INT';
        }
        if (this.currentAppStage === 'TEST') {
          return 'V2-TEST';
        }
      }
      
      return null;
    })();

    if (newStage === null) {
      queryParams.delete('stage');
    } else {
      queryParams.set('stage', newStage);
    }

    return queryParams;
  }

  public computeBBOX(): GeoPositionBBOX {
    const tripPlaces: TripPlace[] = [];
    if (this.fromTripLocation) {
      tripPlaces.push(this.fromTripLocation);
    }
    this.viaTripLocations.forEach(viaTripLocation => {
      tripPlaces.push(viaTripLocation);
    });
    if (this.toTripLocation) {
      tripPlaces.push(this.toTripLocation);
    }

    const bbox = new GeoPositionBBOX([]);
    tripPlaces.forEach(tripPlace => {
      bbox.extend(tripPlace.place.geoPosition);
    });

    return bbox;
  }

  private computeInitialDate(): Date {
    const defaultDate = new Date();

    const tripDateTimeS = this.queryParams.get('trip_datetime') ?? null
    if (tripDateTimeS === null) {
      return defaultDate;
    }

    // following types are working
    // 2025-08-01 10:00
    // 2025-08-01 10:00:00
    // 2025-08-01
    // 2025-09-17T11:15:00
    // 29.Dec.2025 10:00
    const dateTS = Date.parse(tripDateTimeS);
    if (isNaN(dateTS)) {
      console.error('CANT parse custom date string: ' + tripDateTimeS + ', using current datetime instead');
      return defaultDate;
    }

    const tripDateTime = new Date(dateTS);
    return tripDateTime;
  }

  public getStageConfig(forStage: APP_STAGE = this.currentAppStage): OJP_Legacy.ApiConfig {
    const stageConfig = APP_CONFIG.stages[forStage] ?? null;

    if (stageConfig === null) {
      console.error('ERROR - cant find stage' + forStage + ' using PROD');
      return OJP_Legacy.EMPTY_API_CONFIG;
    }

    return stageConfig;
  }

  public updateAppStage(newStage: APP_STAGE) {
    this.currentAppStage = newStage;
    this.stageChanged.emit(newStage);
    this.updateURLs();
  }

  public updateDepartureDateTime(newDateTime: Date) {
    this.departureDate = newDateTime;
    this.updateURLs();
  }

  public updateTripMode() {
    this.updateURLs();
  }

  private computeTripPlacesToUpdate(): TripPlace[] {
    const tripPlacesToUpdate: TripPlace[] = [];

    const endpointTypes: OJP_Legacy.JourneyPointType[] = ['From', 'To'];
    endpointTypes.forEach(endpointType => {
      const isFrom = endpointType === 'From';
      const tripPlace = isFrom ? this.fromTripLocation : this.toTripLocation;
      if (tripPlace === null) {
        return;
      }

      // discard FROM for mode_at_end
      if ((this.tripModeType === 'mode_at_end') && isFrom) {
        return;
      }

      // discard TO for mode_at_start
      if ((this.tripModeType === 'mode_at_start') && !isFrom) {
        return;
      }

      tripPlacesToUpdate.push(tripPlace);
    });

    return tripPlacesToUpdate;
  }

  public updateTripLocationRestrictions(minDuration: number | null, maxDuration: number | null, minDistance: number | null, maxDistance: number | null) {
    const tripLocationsToUpdate = this.computeTripPlacesToUpdate();

    tripLocationsToUpdate.forEach(tripLocation => {
      tripLocation.minDuration = minDuration;
      tripLocation.maxDuration = maxDuration;
      tripLocation.minDistance = minDistance;
      tripLocation.maxDistance = maxDistance;
    });
  }

  public updateTripLocationCustomMode() {
    const tripLocationsToUpdate = this.computeTripPlacesToUpdate();

    tripLocationsToUpdate.forEach(tripLocation => {
      if (this.tripTransportMode === 'public_transport') {
        tripLocation.customTransportMode = null;
      } else {
        tripLocation.customTransportMode = this.tripTransportMode;
      }
    });
  }

  public updateParamsFromTrip(trip: OJP_Legacy.Trip) {
    const hasLegs = trip.legs.length > 0;
    if (!hasLegs) {
      return;
    }

    const firstLeg = trip.legs[0];
    const lastLeg = trip.legs[trip.legs.length - 1];

    const fromPlace = PlaceBuilder.initWithLegacyLocation(firstLeg.fromLocation);
    if (fromPlace) {
      this.fromTripLocation = TripPlace.initWithPlace(fromPlace);
    }

    const toPlace = PlaceBuilder.initWithLegacyLocation(firstLeg.toLocation);
    if (toPlace) {
      this.toTripLocation = TripPlace.initWithPlace(toPlace);
    }

    this.viaTripLocations = [];
    
    this.tripModeType = 'monomodal';
    this.tripTransportMode = 'public_transport';

    this.locationsUpdated.emit();
    this.updateURLs();
  }

  public async fetchFares(language: OJP_Legacy.Language) {
    if (this.journeyTripRequests.length === 0) {
      return;
    }

    // fetch fares only for the public transport
    if (!( (this.tripModeType === 'monomodal') && (this.tripTransportMode === 'public_transport') )) {
      return;
    }

    const tripRequestResponse = this.journeyTripRequests[0].response;
    if (tripRequestResponse === null) {
      return;
    }

    const trips = tripRequestResponse.trips;
    const fareResults = await this.fetchFaresForTrips(language, trips);
    this.updateFares(fareResults);
  }

  public async fetchFaresForTrips(language: OJP_Legacy.Language, trips: OJP_Legacy.Trip[]): Promise<OJP_Types.FareResultSchema[]> {
    const fareHttpConfig = this.getStageConfig('NOVA-INT');
    const ojpSDK_Next = OJP_Next.SDK.v1(REQUESTOR_REF, fareHttpConfig, language);
    
    const tripsV2: OJP_Next.Trip[] = [];
    trips.forEach(tripLegacy => {
      const tripV2_XML = tripLegacy.asXML(OJP_Next.DefaultXML_Config);
      const tripV2 = OJP_Next.Trip.initWithTripXML(tripV2_XML);
      tripsV2.push(tripV2);
    });

    const fareRequest = ojpSDK_Next.requests.FareRequest.initWithOJPv2Trips(tripsV2);

    try {
      const response = await fareRequest.fetchResponse(ojpSDK_Next);
      if (!response.ok) {
        console.log('ERROR: fetchFareRequestResponse');
        console.log(response);
        
        return [];
      }

      return response.value.fareResult;
    } catch (error) {
      console.error('Fetch Fare Error: ', error);
      return [];
    }
  }

  public hasPublicTransport(): boolean {
    return this.tripTransportMode === 'public_transport';
  }

  public createOJP_SDK_Instance(language: OJP_Legacy.Language, appStage: APP_STAGE = this.currentAppStage): OJP_Next.AnySDK {
    const isOJPv2 = OJP_VERSION === '2.0';

    const stageConfig = this.getStageConfig(appStage);
    if (stageConfig.authToken === null) {
      console.error('WARNING: authorization not set for stage=' + appStage);
      console.log(stageConfig);
    }

    if (isOJPv2) {
      const sdk = OJP_Next.SDK.create(REQUESTOR_REF, stageConfig, language);
      return sdk;
    } else {
      const sdk = OJP_Next.SDK.v1(REQUESTOR_REF, stageConfig, language);
      return sdk;
    }
  }
}
