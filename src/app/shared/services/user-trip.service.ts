import { EventEmitter, Injectable } from '@angular/core'
import { MapPoiPropertiesEnum, MapPoiTypeEnum } from '../../map/app-layers/map-poi-type-enum'
import * as OJP from '../ojp-sdk/index'
import { DateHelpers, TripMotTypeHelpers } from '../ojp-sdk/index'
import { MapService } from './map.service'

type LocationUpdateSource = 'SearchForm' | 'MapDragend' | 'MapPopupClick'

@Injectable( {providedIn: 'root'} )
export class UserTripService {
  private queryParams: URLSearchParams

  public fromLocation: OJP.Location | null
  public toLocation: OJP.Location | null
  public viaLocations: OJP.Location[]
  public tripMotTypes: OJP.TripMotType[]
  public lastJourneyResponse: OJP.JourneyResponse | null
  public departureDate: Date
  public currentAppStage: OJP.APP_Stage

  public permalinkURLAddress: string | null

  public locationsUpdated = new EventEmitter<void>();
  public geoLocationsUpdated = new EventEmitter<void>();
  public tripsUpdated = new EventEmitter<OJP.Trip[]>();
  public activeTripSelected = new EventEmitter<OJP.Trip | null>();

  public viaAtIndexRemoved = new EventEmitter<number>();
  public viaAtIndexUpdated = new EventEmitter<{location: OJP.Location, idx: number}>();

  public searchParamsReset = new EventEmitter<void>();

  constructor(private mapService: MapService) {
    this.queryParams = new URLSearchParams(document.location.search)

    this.fromLocation = null
    this.toLocation = null
    this.viaLocations = []
    this.tripMotTypes = ['Default']
    this.lastJourneyResponse = null
    this.departureDate = this.computeInitialDate()
    this.currentAppStage = 'PROD'

    this.permalinkURLAddress = null

    this.initDefaults()
  }

  // TODO
  // ====

  // - check mock - self_driving.xml - should add new mot line - self driving
  // - check meiringen for ond-emand bus - SAVE A MOCK!
  // - add debug XML

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

    const motTypeKeysS = this.queryParams.get('mot_types') ?? null
    const motTypeKeys: string[] = motTypeKeysS === null ? [] : motTypeKeysS.split(';')

    const viaPartsS = this.queryParams.get('via') ?? null
    const viaParts: string[] = viaPartsS === null ? [] : viaPartsS.split(';')
    viaParts.forEach(viaKey => {
      const viaLocation = OJP.Location.initFromLiteralCoords(viaKey)
      if (viaLocation) {
        this.viaLocations.push(viaLocation)

        // TODO - add tripMotType from queryParams
        this.tripMotTypes.push('Default')

        if (viaLocation.geoPosition) {
          bbox.extend(viaLocation.geoPosition)
        }
      }
    });

    let motTypeIDx = 0
    this.tripMotTypes = []
    while (motTypeIDx <= viaParts.length) {
      const motTypeKey = motTypeKeys[motTypeIDx] ?? null
      const motType = OJP.TripMotTypeHelpers.MotTypeFromQueryString(motTypeKey)
      this.tripMotTypes.push(motType)

      motTypeIDx += 1
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
          this.fromLocation = firstLocation
        } else {
          this.toLocation = firstLocation
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
    if (endpointType === 'From') {
      this.fromLocation = location
    }

    if (endpointType === 'To') {
      this.toLocation = location
    }

    if (endpointType === 'Via') {
      // debugger;

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

    this.locationsUpdated.emit();
    this.geoLocationsUpdated.emit();
    this.activeTripSelected.emit(null);

    this.searchParamsReset.emit();
    this.updatePermalinkAddress();
  }

  updateViaPoint(location: OJP.Location, viaIDx: number) {
    this.viaLocations[viaIDx] = location
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
    this.viaLocations.splice(idx, 1)
    this.tripMotTypes.splice(idx, 1)

    // Reset the tripMotTypes
    if (this.viaLocations.length === 0) {
      this.tripMotTypes = ['Default']
    }

    this.viaAtIndexRemoved.emit(idx);
    this.activeTripSelected.emit(null);

    this.searchParamsReset.emit();
    this.updatePermalinkAddress();
  }

  public computeJourneyRequestParams(): OJP.JourneyRequestParams | null {
    const requestParams = OJP.JourneyRequestParams.initWithLocationsAndDate(
      this.fromLocation,
      this.toLocation,
      this.viaLocations,
      this.tripMotTypes,
      this.departureDate,
    )

    return requestParams
  }

  public computeTripRequestXML(departureDate: Date): string {
    const stageConfig = this.getStageConfig()
    const tripRequestParams = OJP.TripsRequestParams.initWithLocationsAndDate(this.fromLocation, this.toLocation, departureDate)
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
      const location = endpointType === 'From' ? this.fromLocation : this.toLocation

      const queryParamKey = endpointType.toLowerCase()

      const stopPlaceRef = location?.stopPlace?.stopPlaceRef ?? null
      if (stopPlaceRef) {
        queryParams.append(queryParamKey, stopPlaceRef)
      } else {
        const geoPositionLngLatS = location?.geoPosition?.asLatLngString(true) ?? null
        if (geoPositionLngLatS) {
          queryParams.append(queryParamKey, geoPositionLngLatS)
        }
      }
    })

    const viaParamParts: string[] = []
    this.viaLocations.forEach(location => {
      const geoPositionLngLatS = location?.geoPosition?.asLatLngString(true) ?? null
      if (geoPositionLngLatS) {
        viaParamParts.push(geoPositionLngLatS)
      }
    });
    if (viaParamParts.length > 0) {
      queryParams.append('via', viaParamParts.join(';'))
    }

    const motTypesParamParts: string[] = []
    this.tripMotTypes.forEach(motType => {
      const motTypeKey = TripMotTypeHelpers.MotTypeKey(motType)
      motTypesParamParts.push(motTypeKey)
    });
    if (motTypesParamParts.length > 0) {
      queryParams.append('mot_types', motTypesParamParts.join(';'))
    }

    const dateTimeS = DateHelpers.formatDate(this.departureDate)
    queryParams.append('trip_datetime', dateTimeS.substr(0, 16))

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
    const stageConfig = OJP.APP_Stages.find(appStage => {
      return appStage.key === forStage
    })

    if (stageConfig === undefined) {
      console.error('ERROR - cant find stage' + forStage + ' using PROD');
      return OJP.APP_Stages[0]
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

    this.fromLocation = firstLeg.fromLocation
    this.toLocation = lastLeg.toLocation

    this.viaLocations = []
    this.tripMotTypes = ['Default']
    
    this.geoLocationsUpdated.emit()
    this.updatePermalinkAddress()
  }
}
