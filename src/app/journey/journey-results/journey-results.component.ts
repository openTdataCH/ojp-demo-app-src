import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import * as OJP_Next from 'ojp-sdk-next';
import * as OJP_Types from 'ojp-shared-types';
import OJP_Legacy from '../../config/ojp-legacy';

import { REQUESTOR_REF, OJP_VERSION } from '../../config/constants';

import { UserTripService } from 'src/app/shared/services/user-trip.service';
import { MapService } from '../../shared/services/map.service'
import { LanguageService } from '../../shared/services/language.service';
import { TripData } from '../../shared/types/trip';
import { TripRequestBuilder } from '../../shared/models/trip/trip-request';

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

  constructor(private userTripService: UserTripService, private mapService: MapService, private languageService: LanguageService, private sanitizer: DomSanitizer) {
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

  public async loadPreviousTrips() {
    if (this.model.tripsData.length === 0) {
      return;
    }

    const tripsWithTimedLegs = this.model.tripsData.filter(tripData => (tripData.legsData.filter(legData => legData.leg.type === 'TimedLeg')).length > 0);
    if (tripsWithTimedLegs.length === 0) {
      return;
    }

    const firstTrip = tripsWithTimedLegs[0].trip;
    const depArrDate = firstTrip.computeTimedLegDepartureTime();
    if (depArrDate === null) {
      return;
    }

    this.model.isFetchingPrevTrips = true;

    await this.loadTrips('NumberOfResultsBefore', depArrDate);
  }

  public async loadNextTrips() {
    if (this.model.tripsData.length === 0) {
      return;
    }

    const tripsWithTimedLegs = this.model.tripsData.filter(tripData => (tripData.legsData.filter(legData => legData.leg.type === 'TimedLeg')).length > 0);
    if (tripsWithTimedLegs.length === 0) {
      return;
    }

    const lastTrip = tripsWithTimedLegs[tripsWithTimedLegs.length - 1].trip;
    const depArrDate = lastTrip.computeTimedLegDepartureTime();
    if (depArrDate === null) {
      return;
    }

    this.model.isFetchingNextTrips = true;

    await this.loadTrips('NumberOfResultsAfter', depArrDate);
  }

  private async loadTrips(numberOfResultsType: NumberOfResultsType, depArrDate: Date) {
    const sdk = this.userTripService.createOJP_SDK_Instance(this.languageService.language);
    const includeLegProjection = true;
    
    const request = TripRequestBuilder.computeTripRequest(this.userTripService, sdk, includeLegProjection);
    if (request === null) {
      return;
    }

    request.setDepartureDatetime(depArrDate);

    request.enableLinkProkection();

    const numberOfResults: number | null = (() => {
      const hasPublicTransport = this.userTripService.hasPublicTransport();
      
      return hasPublicTransport ? this.userTripService.numberOfResults : null;
    })();

    if (numberOfResults === null) {
      console.log('NumberOfResults is not set?');
      return;
    }

    if (numberOfResultsType === 'NumberOfResultsBefore') {
      request.setNumberOfResults(null);
      request.setNumberOfResultsBefore(numberOfResults);
    }
    if (numberOfResultsType === 'NumberOfResultsAfter') {
      request.setNumberOfResults(null);
      request.setNumberOfResultsAfter(numberOfResults);
    }

    const response = await request.fetchResponse(sdk);
    if (!response.ok) {
      console.log('ERROR with TR for ' + numberOfResultsType);
      console.log(request);
      return;
    }


    const trips = TripRequestBuilder.parseTrips(this.sanitizer, response);

    this.userTripService.tripRequestFinished.emit(request.requestInfo);
    this.userTripService.updateTrips(trips);

    this.userTripService.fetchFares(this.languageService.language);

    if (trips.length === 0) {
      this.userTripService.mapActiveTripSelected.emit(null);
    }
  }

  private updatePageModel(tripsData: TripData[]) {
    this.model.tripsData = tripsData;
    this.model.hasPagination = this.computeHasPagination(tripsData.length);
    // Update both - TODO - use a completion instead?
    this.model.isFetchingPrevTrips = false;
    this.model.isFetchingNextTrips = false;    
  }
}
