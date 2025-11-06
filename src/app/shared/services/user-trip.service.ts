import { EventEmitter, Injectable } from '@angular/core'

import mapboxgl from 'mapbox-gl'

import * as OJP_SharedTypes from 'ojp-shared-types';
import * as OJP_Next from 'ojp-sdk-next';

import OJP_Legacy from '../../config/ojp-legacy';

import { APP_CONFIG } from '../../config/app-config';
import { APP_STAGE, DEBUG_LEVEL, DEFAULT_APP_STAGE, REQUESTOR_REF, TRIP_REQUEST_DEFAULT_NUMBER_OF_RESULTS, OJP_VERSION } from '../../config/constants';

import { IMapBoundsData, MapService } from './map.service';
import { MapTrip } from '../types/map-geometry-types';
import { TripData, TripLegData } from '../types/trip';
import { AnyPlace, PlaceBuilder } from '../models/place/place-builder';
import { PlaceLocation } from '../models/place/location';

type LocationUpdateSource = 'SearchForm' | 'MapDragend' | 'MapPopupClick';

@Injectable( {providedIn: 'root'} )
export class UserTripService {
  private queryParams: URLSearchParams

  public fromTripLocation: OJP_Legacy.TripLocationPoint | null
  public toTripLocation: OJP_Legacy.TripLocationPoint | null
  public viaTripLocations: OJP_Legacy.TripLocationPoint[]
  public isViaEnabled: boolean;

  public isAdditionalRestrictionsEnabled: boolean;
  
  public numberOfResults: number | null
  public numberOfResultsBefore: number | null
  public numberOfResultsAfter: number | null
  public publicTransportModesFilter: OJP_Legacy.ModeOfTransportType[];
  public useRealTimeDataType: OJP_SharedTypes.UseRealtimeDataEnum;
  public walkSpeedDeviation: number | null;

  public currentBoardingType: OJP_Legacy.TripRequestBoardingType;

  public tripModeType: OJP_Legacy.TripModeType
  public tripTransportMode: OJP_Legacy.IndividualTransportMode;

  public journeyTripRequests: OJP_Legacy.TripRequest[]
  public departureDate: Date
  public currentAppStage: APP_STAGE

  public permalinkRelativeURL: string | null;
  public otherVersionURL: string | null;
  public otherVersionURLText: string | null;
  public sbbURL: string | null;
  public embedQueryParams = new URLSearchParams();

  public defaultsInited = new EventEmitter<void>();
  public searchFormAfterDefaultsInited = new EventEmitter<void>();
  public locationsUpdated = new EventEmitter<void>();
  public geoLocationsUpdated = new EventEmitter<void>();
  public tripsDataUpdated = new EventEmitter<TripData[]>();
  
  public tripFaresUpdated = new EventEmitter<OJP_SharedTypes.FareResultSchema[]>();
  
  public activeTripSelected = new EventEmitter<MapTrip | null>();
  public tripRequestFinished = new EventEmitter<OJP_Legacy.RequestInfo>();

  public searchParamsReset = new EventEmitter<void>();

  constructor(private mapService: MapService) {
    this.queryParams = new URLSearchParams(document.location.search)

    this.fromTripLocation = null
    this.toTripLocation = null
    this.viaTripLocations = []
    
    this.numberOfResults = TRIP_REQUEST_DEFAULT_NUMBER_OF_RESULTS;
    this.numberOfResultsBefore = null;
    this.numberOfResultsAfter = null;
    this.publicTransportModesFilter = [];
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

  public async initDefaults(language: OJP_Legacy.Language) {
    const appStageS = this.queryParams.get('stage') ?? null;
    if (appStageS) {
      const userAppStage = this.computeAppStageFromString(appStageS);
      if (userAppStage) {
        setTimeout(() => {
          // HACK 
          // without the setTimeout , the parent src/app/journey/journey-search/journey-search.component.html template 
          // gives following errors core.mjs:9157 ERROR RuntimeError: NG0100: ExpressionChangedAfterItHasBeenCheckedError: 
          // Expression has changed after it was checked. Previous value: 'PROD'. Current value: 'INT'. 
          // Find more at https://angular.io/errors/NG0100
          this.currentAppStage = userAppStage;
        });
      }
    }

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

    const stageConfig = this.getStageConfig();
    if (stageConfig.authToken === null) {
      console.error('WARNING: authorization not set for stage=' + this.currentAppStage);
      console.log(stageConfig);
    }

    const ojpSDK_Next = this.createOJP_SDK_Instance(language);

    const bbox = new OJP_Legacy.GeoPositionBBOX([]);

    const endpointTypes: OJP_Legacy.JourneyPointType[] = ['From', 'To'];
    for (const endpointType of endpointTypes) {
      const isFrom = endpointType === 'From';

      let stopPlaceRef = isFrom ? fromPlaceRef : toPlaceRef;
      
      // OJP-SI cant handle StopRefs
      if (this.currentAppStage === 'OJP-SI') {
        stopPlaceRef = isFrom ? fromPlaceName : toPlaceName;
      }
      
      // LA Beta hack, strip everything before |
      if (this.currentAppStage === 'LA Beta') {
        const stopPlaceRefMatches = stopPlaceRef.match(/^[^\|]+?\|(.+?)$/);
        if (stopPlaceRefMatches) {
          stopPlaceRef = stopPlaceRefMatches[1];
        } else {
          console.error('ERROR LA Beta - CANT match stopPlaceRef');
        }
      }

      let place: AnyPlace | null = null;

      const coordsLocation = OJP_Legacy.Location.initFromLiteralCoords(stopPlaceRef);
      if (coordsLocation?.geoPosition) {
        place = new PlaceLocation(coordsLocation.geoPosition.longitude, coordsLocation.geoPosition.latitude);
      } else {
        let request = OJP_Next.LocationInformationRequest.initWithPlaceRef(stopPlaceRef, 10);
        // Check if is location name instead of stopId / sloid
        if (typeof stopPlaceRef === 'string' && /^[A-Z]/.test(stopPlaceRef)) {
          request = OJP_Next.LocationInformationRequest.initWithLocationName(stopPlaceRef, ['stop'], 10);
        }

        place = await this.fetchPlace(ojpSDK_Next, request);
      }

      if (!place) {
        continue;
      }

      const location = place.asOJP_LegacyLocation();
      if (isFrom) {
        this.fromTripLocation = new OJP_Legacy.TripLocationPoint(location);
      } else {
        this.toTripLocation = new OJP_Legacy.TripLocationPoint(location);
      }

      if (location.geoPosition) {
        bbox.extend(location.geoPosition);
      }
    };

    this.viaTripLocations = [];

    const viaPartsS = this.queryParams.get('via') ?? null;
    const viaParts: string[] = viaPartsS === null ? [] : viaPartsS.split(';');
    for (const viaKey of viaParts) {
      let place: AnyPlace | null = null;

      const coordsLocation = OJP_Legacy.Location.initFromLiteralCoords(viaKey);
      if (coordsLocation?.geoPosition) {
        place = new PlaceLocation(coordsLocation.geoPosition.longitude, coordsLocation.geoPosition.latitude);
      } else {
        const request = OJP_Next.LocationInformationRequest.initWithPlaceRef(viaKey, 10);
        place = await this.fetchPlace(ojpSDK_Next, request);
      }

      if (!place) {
        continue;
      }

      this.isViaEnabled = true;
      
      const location = place.asOJP_LegacyLocation();
      const viaTripLocation = new OJP_Legacy.TripLocationPoint(location);
      this.viaTripLocations.push(viaTripLocation);

      if (location.geoPosition) {
        bbox.extend(location.geoPosition)
      }
    };
    
    this.tripModeType = 'monomodal';
    const tripModeTypesS = this.queryParams.get('mode_types') ?? null;
    if (tripModeTypesS !== null) {
      this.tripModeType = tripModeTypesS.split(';')[0] as OJP_Legacy.TripModeType;
    }

    this.tripTransportMode = 'public_transport';
    const tripTransportModesS = this.queryParams.get('transport_modes') ?? null;
    if (tripTransportModesS !== null) {
      this.tripTransportMode = tripTransportModesS.split(';')[0] as OJP_Legacy.IndividualTransportMode;
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

    this.locationsUpdated.emit();
    this.geoLocationsUpdated.emit();
    this.updateURLs();

    if (bbox.isValid()) {
      const shouldZoomToBounds = this.queryParams.has('from') || this.queryParams.has('to');
      if (shouldZoomToBounds && !this.mapService.initialMapCenter) {
        const bounds = new mapboxgl.LngLatBounds(bbox.asFeatureBBOX());
        const mapData: IMapBoundsData = {
          bounds: bounds,
          disableEase: true,
        };
        
        this.mapService.newMapBoundsRequested.emit(mapData);
      }
    }

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
  }

  private async fetchPlace(sdk: OJP_Next.SDK, request: OJP_Next.LocationInformationRequest): Promise<AnyPlace | null> {
    const response = await sdk.fetchLocationInformationRequestResponse(request);

    if (!response.ok) {
      console.log('ERROR - fetchPlace.LIR - issue');
      console.log(response);
      return null;
    }

    const placeResults = response.value.placeResult;
    if (placeResults.length === 0) {
      return null;
    }

    const place = PlaceBuilder.initWithPlaceResultSchema(placeResults[0]);
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

      const geoPosition = tripLocation.location.geoPosition;
      if (geoPosition === null) {
        continue;
      }

      // Search nearby locations, in a bbox of 200x200m
      const bbox = OJP_Legacy.GeoPositionBBOX.initFromGeoPosition(geoPosition, 200, 200);
      const bboxData = bbox.asFeatureBBOX();
      const request = OJP_Next.LocationInformationRequest.initWithBBOX(bboxData, ['stop'], 300);

      const response = await ojpSDK_Next.fetchLocationInformationRequestResponse(request);

      if (!response.ok) {
          console.log('ERROR - failed to bbox lookup locations for "' + bboxData.join(', ') + '"');
          console.log(response);
          continue;
      }

      const locations: OJP_Legacy.Location[] = [];
      response.value.placeResult.forEach((placeResult) => {
        const place = PlaceBuilder.initWithPlaceResultSchema(placeResult);
        if (place === null) {
          return;
        }

        const location = place.asOJP_LegacyLocation();
        locations.push(location);
      });

      const nearbyLocation = tripLocation.location.findClosestLocation(locations);
      if (nearbyLocation === null) {
        continue;
      }

      if (isFrom) {
        this.fromTripLocation = new OJP_Legacy.TripLocationPoint(nearbyLocation.location)
      } else {
        this.toTripLocation = new OJP_Legacy.TripLocationPoint(nearbyLocation.location)
      }
    };

    this.updateURLs();
    this.locationsUpdated.emit();
    this.geoLocationsUpdated.emit();
  }

  public switchEndpoints() {
    const locationAux = Object.assign({}, this.fromTripLocation);
    this.fromTripLocation = Object.assign({}, this.toTripLocation);
    this.toTripLocation = Object.assign({}, locationAux);

    this.locationsUpdated.emit();
    this.geoLocationsUpdated.emit();
    this.activeTripSelected.emit(null);

    this.searchParamsReset.emit();
    this.updateURLs();
  }

  public updateVia() {
    this.isViaEnabled = !this.isViaEnabled;

    this.locationsUpdated.emit();
    this.geoLocationsUpdated.emit();
    this.activeTripSelected.emit(null);

    this.searchParamsReset.emit();
    this.updateURLs();
  }

  private computeAppStageFromString(appStageS: string): APP_STAGE {
    const availableStages = Object.keys(APP_CONFIG.stages) as APP_STAGE[];

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
      const location = place.asOJP_LegacyLocation();
      const viaTripLocation = new OJP_Legacy.TripLocationPoint(location);
      this.viaTripLocations = [viaTripLocation];

      this.isViaEnabled = true;
    }

    this.locationsUpdated.emit();
    this.geoLocationsUpdated.emit();
    this.activeTripSelected.emit(null);

    this.searchParamsReset.emit();
    this.updateURLs();
  }

  private patchTripLocationPoint(tripLocation: OJP_Legacy.TripLocationPoint, place: AnyPlace) {
    const customTransportMode = tripLocation.customTransportMode ?? null;
    const minDistance = tripLocation.minDistance ?? null;
    const maxDistance = tripLocation.maxDistance ?? null;
    const minDuration = tripLocation.minDuration ?? null;
    const maxDuration = tripLocation.maxDuration ?? null;

    const location = place.asOJP_LegacyLocation();
    const newTripLocation = new OJP_Legacy.TripLocationPoint(location);
    newTripLocation.customTransportMode = customTransportMode;
    newTripLocation.minDistance = minDistance;
    newTripLocation.maxDistance = maxDistance;
    newTripLocation.minDuration = minDuration;
    newTripLocation.maxDuration = maxDuration;

    return newTripLocation;
  }

  updateViaPoint(location: OJP_Legacy.Location, viaIDx: number) {
    this.viaTripLocations[viaIDx].location = location;

    this.locationsUpdated.emit();
    this.geoLocationsUpdated.emit();
    this.activeTripSelected.emit(null);

    this.searchParamsReset.emit();
    this.updateURLs();
  }

  updateTrips(trips: OJP_Legacy.Trip[]) {
    const tripsData = this.massageTrips(trips);
    this.tripsDataUpdated.emit(tripsData);
  }

  selectActiveTrip(mapTrip: MapTrip | null) {
    this.activeTripSelected.emit(mapTrip);
  }

  private updateFares(fareResults: OJP_SharedTypes.FareResultSchema[]) {
    this.tripFaresUpdated.emit(fareResults);
  }

  public updateURLs() {
    const queryParams = new URLSearchParams();

    const endpointTypes: OJP_Legacy.JourneyPointType[] = ['From', 'To'];
    endpointTypes.forEach(endpointType => {
      const tripLocationPoint = endpointType === 'From' ? this.fromTripLocation : this.toTripLocation;

      const queryParamKey = endpointType.toLowerCase();

      const stopPlaceRef = tripLocationPoint?.location.stopPlace?.stopPlaceRef ?? null;
      if (stopPlaceRef) {
        queryParams.append(queryParamKey, stopPlaceRef);
      } else {
        let geoPositionLngLatS = tripLocationPoint?.location.geoPosition?.asLatLngString(true) ?? null;
        if (geoPositionLngLatS) {
          const includeLiteralCoords = false;
          const locationName = tripLocationPoint?.location.computeLocationName(includeLiteralCoords);
          if (locationName) {
            geoPositionLngLatS = geoPositionLngLatS + '(' + locationName + ')';
          }

          queryParams.append(queryParamKey, geoPositionLngLatS);
        }
      }
    })

    const viaParamParts: string[] = []
    this.viaTripLocations.forEach(viaTripLocation => {
      const location = viaTripLocation.location;
      if (location.stopPlace) {
        viaParamParts.push(location.stopPlace.stopPlaceRef);
      } else {
        const geoPositionLngLatS = location?.geoPosition?.asLatLngString(true) ?? null;
        if (geoPositionLngLatS) {
          viaParamParts.push(geoPositionLngLatS);
        }
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
        const label = tripPoint.location.computeLocationName() ?? defaultLabel;

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
    this.updateURLs();
  }

  public updateDepartureDateTime(newDateTime: Date) {
    this.departureDate = newDateTime;
    this.updateURLs();
  }

  public updateTripMode() {
    this.updateURLs();
  }

  private computeTripLocationsToUpdate(): OJP_Legacy.TripLocationPoint[] {
    const tripLocationsToUpdate: OJP_Legacy.TripLocationPoint[] = [];

    const endpointTypes: OJP_Legacy.JourneyPointType[] = ['From', 'To'];
    endpointTypes.forEach(endpointType => {
      const isFrom = endpointType === 'From';
      const tripLocation = isFrom ? this.fromTripLocation : this.toTripLocation;
      if (tripLocation === null) {
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

      tripLocationsToUpdate.push(tripLocation);
    });

    return tripLocationsToUpdate;
  }

  public updateTripLocationRestrictions(minDuration: number | null, maxDuration: number | null, minDistance: number | null, maxDistance: number | null) {
    const tripLocationsToUpdate = this.computeTripLocationsToUpdate();

    tripLocationsToUpdate.forEach(tripLocation => {
      tripLocation.minDuration = minDuration;
      tripLocation.maxDuration = maxDuration;
      tripLocation.minDistance = minDistance;
      tripLocation.maxDistance = maxDistance;
    });
  }

  public updateTripLocationCustomMode() {
    const tripLocationsToUpdate = this.computeTripLocationsToUpdate();

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

    this.fromTripLocation = new OJP_Legacy.TripLocationPoint(firstLeg.fromLocation);
    if (this.fromTripLocation.location.geoPosition === null) {
      this.fromTripLocation.location.geoPosition = firstLeg.legTrack?.fromGeoPosition() ?? null;
    }

    this.toTripLocation = new OJP_Legacy.TripLocationPoint(lastLeg.toLocation);
    if (this.toTripLocation.location.geoPosition === null) {
      this.toTripLocation.location.geoPosition = firstLeg.legTrack?.toGeoPosition() ?? null;
    }

    this.viaTripLocations = [];
    
    this.tripModeType = 'monomodal';
    this.tripTransportMode = 'public_transport';

    this.geoLocationsUpdated.emit()
    this.updateURLs()
  }

  public massageTrips(trips: OJP_Legacy.Trip[]): TripData[] {
    const tripsData = trips.map(trip => {
      const legsData = trip.legs.map(leg => {
        const legData: TripLegData = {
          leg: leg,
          info: {
            id: '' + leg.legID,
            comments: null,
          },
        };

        return legData;
      });

      const tripData: TripData = {
        trip: trip,
        fareResult: null,
        legsData: legsData,
        info: {
          comments: null,
        }
      };

      return tripData;
    });
    
    this.mergeTripLegs(tripsData);

    return tripsData;
  }

  // Some of the legs can be merged
  // ex1: trains with multiple desitinaion units
  // - check for remainInVehicle https://github.com/openTdataCH/ojp-demo-app-src/issues/125  
  private mergeTripLegs(tripsData: TripData[]) {
    tripsData.forEach(tripData => {
      const newLegsData: TripLegData[] = [];
      let skipIdx: number = -1;
      
      tripData.trip.legs.forEach((leg, legIdx) => {
        const legData: TripLegData = {
          leg: leg,
          info: {
            id: '' + leg.legID,
            comments: null,
          },
        };

        if (legIdx <= skipIdx) {
          return;
        }

        const leg2Idx = legIdx + 1;
        const leg3Idx = legIdx + 2;
        if (leg3Idx >= tripData.trip.legs.length) {
          newLegsData.push(legData);
          return;
        }

        // If TransferLeg of type 'remainInVehicle'
        // => merge prev / next TimedLeg legs
        let shouldMergeLegs = false;
        const leg2 = tripData.trip.legs[leg2Idx];
        const leg3 = tripData.trip.legs[leg3Idx];
        if (leg.legType === 'TimedLeg' && leg2.legType === 'TransferLeg' && leg3.legType === 'TimedLeg') {
          const continousLeg = leg2 as OJP_Legacy.TripContinuousLeg;
          if ((continousLeg.transferMode === 'remainInVehicle') || (continousLeg.transferMode === 'changeWithinVehicle')) {
            shouldMergeLegs = true;
            skipIdx = leg3Idx;
          }
        }

        if (shouldMergeLegs) {
          const newLeg = this.mergeTimedLegs(leg as OJP_Legacy.TripTimedLeg, leg3 as OJP_Legacy.TripTimedLeg);
          legData.leg = newLeg;
          legData.info.id = (legIdx + 1) + '-' + (leg3Idx + 1);
          legData.info.comments = 'Timed legs were merged: ' +  legData.info.id;
        }

        newLegsData.push(legData);
      });

      if (tripData.trip.legs.length > 0 && (tripData.trip.legs.length !== newLegsData.length)) {
        tripData.info.comments = 'APP-HACK - mergeTripLegs - remainInVehicle usecase, before: ' + tripData.trip.legs.length + ', after: ' + newLegsData.length + ' legs';

        if (DEBUG_LEVEL === 'DEBUG') {
          console.log(tripData.info.comments);
        }

        tripData.legsData = newLegsData;
      }
    });
  }

  private mergeTimedLegs(leg1: OJP_Legacy.TripTimedLeg, leg2: OJP_Legacy.TripTimedLeg) {
    let newLegIntermediatePoints = leg1.intermediateStopPoints.slice();
    leg1.toStopPoint.stopPointType = 'Intermediate';
    newLegIntermediatePoints.push(leg1.toStopPoint);
    newLegIntermediatePoints = newLegIntermediatePoints.concat(leg2.intermediateStopPoints.slice());

    const newLeg = new OJP_Legacy.TripTimedLeg(leg1.legID, leg1.service, leg1.fromStopPoint, leg2.toStopPoint, newLegIntermediatePoints);

    if (leg1.legDuration !== null && leg2.legDuration !== null) {
      newLeg.legDuration = leg1.legDuration.plus(leg2.legDuration);
    }

    if (leg1.legTrack !== null && leg2.legTrack !== null) {
      newLeg.legTrack = leg1.legTrack.plus(leg2.legTrack);
    }
    
    return newLeg;
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

  public async fetchFaresForTrips(language: OJP_Legacy.Language, trips: OJP_Legacy.Trip[]): Promise<OJP_SharedTypes.FareResultSchema[]> {
    const fareHttpConfig = this.getStageConfig('NOVA-INT');
    const ojpSDK_Next = new OJP_Next.SDK(REQUESTOR_REF, fareHttpConfig, language, OJP_Next.XML_BuilderConfigOJPv1);

    const tripsV2: OJP_Next.Trip[] = [];
    trips.forEach(tripLegacy => {
      const tripV2_XML = tripLegacy.asXML(OJP_Next.DefaultXML_Config);
      const tripV2 = OJP_Next.Trip.initWithTripXML(tripV2_XML);
      tripsV2.push(tripV2);
    });

    const fareRequest = OJP_Next.FareRequest.initWithOJPv2Trips(tripsV2);
    const response = await ojpSDK_Next.fetchFareRequestResponse(fareRequest);

    if (!response.ok) {
      console.log('ERROR: fetchFareRequestResponse');
      console.log(response);
      
      return [];
    }

    return response.value.fareResult;
  }

  public hasPublicTransport(): boolean {
    return this.tripTransportMode === 'public_transport';
  }

  private createOJP_SDK_Instance(language: OJP_Legacy.Language): OJP_Next.SDK {
    const isOJPv2 = OJP_VERSION === '2.0';
    const xmlConfig = isOJPv2 ? OJP_Next.DefaultXML_Config : OJP_Next.XML_BuilderConfigOJPv1;

    const stageConfig = this.getStageConfig();
    const sdk = new OJP_Next.SDK(REQUESTOR_REF, stageConfig, language, xmlConfig);
    return sdk;
  }  
}
