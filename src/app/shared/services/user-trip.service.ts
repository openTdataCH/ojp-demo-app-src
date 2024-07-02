import { EventEmitter, Injectable } from '@angular/core'

import { APP_CONFIG, APP_STAGE } from '../../config/app-config'
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
  
  // Used by the src/app/search-form/search-form.component.html template
  public journeyTripsPlaceholder: string[]
  
  public tripModeTypes: OJP.TripModeType[]
  public tripTransportModes: OJP.IndividualTransportMode[]

  public journeyTripRequests: OJP.TripRequest[]
  public departureDate: Date
  public currentAppStage: APP_STAGE

  public permalinkRelativeURL: string | null;
  public prodURL: string | null;
  public betaURL: string | null;
  public betaV2URL: string | null;
  public sbbURL: string | null;
  public embedQueryParams = new URLSearchParams()

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

    this.journeyTripRequests = [];
    
    this.departureDate = this.computeInitialDate()
    this.currentAppStage = 'V2-INT';

    this.permalinkRelativeURL = null;
    this.prodURL = null;
    this.betaURL = null;
    this.betaV2URL = null;
    this.sbbURL = null;
  }

  public initDefaults() {
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
        let locationInformationRequest = OJP.LocationInformationRequest.initWithStopPlaceRef(stageConfig, stopPlaceRef);
        // Check if is location name instead of stopId / sloid
        if (typeof stopPlaceRef === 'string' && /^[A-Z]/.test(stopPlaceRef)) {
          locationInformationRequest = OJP.LocationInformationRequest.initWithLocationName(stageConfig, stopPlaceRef, []);
        }

        const locationInformationPromise = locationInformationRequest.fetchLocations();
        promises.push(locationInformationPromise);
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

    this.updatePermalinkAddress();
    this.locationsUpdated.emit();
    this.geoLocationsUpdated.emit();
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
  }

  selectActiveTrip(trip: OJP.Trip | null) {
    this.activeTripSelected.emit(trip);
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

  public computeTripRequestXML(departureDate: Date): string {
    const stageConfig = this.getStageConfig();
    const request = OJP.TripRequest.initWithTripLocationsAndDate(stageConfig, this.fromTripLocation, this.toTripLocation, departureDate);
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

    this.permalinkRelativeURL = document.location.pathname.replace('/embed', '') + '?' + queryParams.toString();
    this.updateLinkedURLs(queryParams);

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

  private updateLinkedURLs(queryParams: URLSearchParams) {
    this.prodURL = 'https://opentdatach.github.io/ojp-demo-app/search?' + queryParams.toString();

    const betaQueryParams = new URLSearchParams(queryParams);
    this.betaURL = 'https://tools.odpch.ch/beta-ojp-demo/search?' + betaQueryParams.toString();

    betaQueryParams.set('stage', 'v2-prod');
    this.betaV2URL = 'https://tools.odpch.ch/ojp-demo-v2/search?' + betaQueryParams.toString();

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
    
    this.journeyTripsPlaceholder = ['-'];
    this.tripModeTypes = ['monomodal'];
    this.tripTransportModes = ['public_transport'];
    
    this.geoLocationsUpdated.emit()
    this.updatePermalinkAddress()
  }
}
