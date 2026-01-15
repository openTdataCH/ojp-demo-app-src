import { Component, OnInit } from '@angular/core';
import { UserTripService } from 'src/app/shared/services/user-trip.service';

import * as OJP_Next from 'ojp-sdk-next';
import * as OJP_Types from 'ojp-shared-types';
import OJP_Legacy from '../../config/ojp-legacy';

import { REQUESTOR_REF, OJP_VERSION } from '../../config/constants';

import { MapService } from '../../shared/services/map.service'
import { LanguageService } from '../../shared/services/language.service';
import { TripData } from '../../shared/types/trip';

type NumberOfResultsType = 'NumberOfResults' | 'NumberOfResultsBefore' | 'NumberOfResultsAfter';

interface PageModel {
  tripsData: TripData[]
  mapFareResult: Record<string, OJP_Types.FareResultSchema | null>
  hasPagination: boolean
  isFetchingPrevTrips: boolean
  isFetchingNextTrips: boolean
}

@Component({
  selector: 'journey-results',
  templateUrl: './journey-results.component.html',
  styleUrls: ['./journey-results.component.scss'],
})
export class JourneyResultsComponent implements OnInit {
  public model: PageModel;

  constructor(private userTripService: UserTripService, private mapService: MapService, private languageService: LanguageService) {
    this.model = {
      tripsData: [],
      mapFareResult: {},
      hasPagination: false,
      isFetchingPrevTrips: false,
      isFetchingNextTrips: false,
    };

    const tripsNo = 0;
    this.model.hasPagination = this.computeHasPagination(tripsNo);
  }

  private computeHasPagination(tripsNo: number): boolean {
    if (tripsNo === 0) {
      return false;
    }

    const hasPublicTransport = this.userTripService.hasPublicTransport();

    return hasPublicTransport;
  }

  ngOnInit() {
    this.userTripService.tripsDataUpdated.subscribe(tripsData => {
      this.updatePageModel(tripsData);
    });

    this.userTripService.searchParamsReset.subscribe(() => {
      this.updatePageModel([]);
    });

    this.userTripService.tripFaresUpdated.subscribe(fareResults => {
      this.model.mapFareResult = {};

      fareResults.forEach(fareResult => {
        const foundTripData = this.model.tripsData.find(tripData => {
          return tripData.trip.id === fareResult.resultId
        }) ?? null;

        if (foundTripData === null) {
          console.error('ERROR - cant find fare for trip ' + fareResult.resultId);
          console.log(this.model.tripsData);
          console.log(fareResult);
          return;
        }

        this.model.mapFareResult[foundTripData.trip.id] = fareResult;
      });
    })
  }

  public loadPreviousTrips() {
    if (this.model.tripsData.length === 0) {
      return;
    }

    const depArrDate = this.model.tripsData[0].trip.computeDepartureTime();
    if (depArrDate === null) {
      return;
    }

    this.model.isFetchingPrevTrips = true;

    this.loadTrips('NumberOfResultsBefore', depArrDate);
  }

  public loadNextTrips() {
    if (this.model.tripsData.length === 0) {
      return;
    }

    const tripsWithTimedLegs = this.model.tripsData.filter(tripData => (tripData.legsData.filter(legData => legData.leg.legType === 'TimedLeg')).length > 0);
    if (tripsWithTimedLegs.length === 0) {
      return;
    }

    const lastTripData = tripsWithTimedLegs[tripsWithTimedLegs.length - 1];
    const depArrDate = lastTripData.trip.computeDepartureTime();
    if (depArrDate === null) {
      return;
    }

    this.model.isFetchingNextTrips = true;

    this.loadTrips('NumberOfResultsAfter', depArrDate);
  }

  private loadTrips(numberOfResultsType: NumberOfResultsType, depArrDate: Date) {
    const viaTripLocations = this.userTripService.isViaEnabled ? this.userTripService.viaTripLocations.map(el => el.asOJP_TripLocationPoint()) : [];

    const numberOfResults: number | null = (() => {
      const hasPublicTransport = this.userTripService.hasPublicTransport();
      
      return hasPublicTransport ? this.userTripService.numberOfResults : null;
    })();

    let numberOfResultsBefore: number | null = null;
    if (numberOfResultsType === 'NumberOfResultsBefore') {
      numberOfResultsBefore = numberOfResults;
    }

    let numberOfResultsAfter: number | null = null;
    if (numberOfResultsType === 'NumberOfResultsAfter') {
      numberOfResultsAfter = numberOfResults;
    }

    const stageConfig = this.userTripService.getStageConfig();
    const isOJPv2 = OJP_VERSION === '2.0';
    const xmlConfig = isOJPv2 ? OJP_Next.DefaultXML_Config : OJP_Next.XML_BuilderConfigOJPv1;

    const fromTripLocation = this.userTripService.fromTripPlace?.asOJP_TripLocationPoint() ?? null;
    const toTripLocation = this.userTripService.toTripPlace?.asOJP_TripLocationPoint() ?? null;
    
    const request = OJP_Legacy.TripRequest.initWithTripLocationsAndDate(
      stageConfig,
      this.languageService.language,
      xmlConfig,
      REQUESTOR_REF,
      
      fromTripLocation,
      toTripLocation,
      depArrDate,
      this.userTripService.currentBoardingType,
      true,
      this.userTripService.tripModeType,
      this.userTripService.tripTransportMode,
      viaTripLocations,
      null,
      numberOfResultsBefore,
      numberOfResultsAfter,
      this.userTripService.publicTransportModesFilter,
    );

    if (request === null) {
      return;
    }
    
    request.enableExtensions = this.userTripService.currentAppStage !== 'OJP-SI';
    request.useRealTimeDataType = this.userTripService.useRealTimeDataType;

    if (isOJPv2) {
      request.walkSpeedDeviation = this.userTripService.walkSpeedDeviation;
    }

    this.userTripService.journeyTripRequests = [request];

    request.fetchResponse().then(response => {
      const trips = response.trips;
      this.userTripService.updateTrips(trips);

      const requestInfo = request.requestInfo;
      this.userTripService.tripRequestFinished.emit(requestInfo);

      if (trips.length > 0) {
        this.userTripService.fetchFares(this.languageService.language);
      } else {
        this.userTripService.mapActiveTripSelected.emit(null);
      }
    });
  }

  private updatePageModel(tripsData: TripData[]) {
    this.model.tripsData = tripsData;
    this.model.hasPagination = this.computeHasPagination(tripsData.length);
    // Update both - TODO - use a completion instead?
    this.model.isFetchingPrevTrips = false;
    this.model.isFetchingNextTrips = false;    
  }
}
