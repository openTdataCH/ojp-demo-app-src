import { Component, OnInit } from '@angular/core';
import { UserTripService } from 'src/app/shared/services/user-trip.service';

import * as OJP_Legacy from 'ojp-sdk-v2';
import { MapService } from '../../shared/services/map.service'
import { LanguageService } from '../../shared/services/language.service';

type NumberOfResultsType = 'NumberOfResults' | 'NumberOfResultsBefore' | 'NumberOfResultsAfter';

interface PageModel {
  trips: OJP_Legacy.Trip[]
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
      trips: [],
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
    this.userTripService.tripsUpdated.subscribe(trips => {
      this.updatePageModel(trips);
    });

    this.userTripService.searchParamsReset.subscribe(() => {
      this.updatePageModel([]);
    });

    this.userTripService.tripFaresUpdated.subscribe(fareResults => {
      this.model.trips.forEach(trip => {
        trip.tripFareResults = [];
      });

      fareResults.forEach(fareResult => {
        const trip = this.model.trips.find(trip => {
          return trip.id === fareResult.tripId
        }) ?? null;

        if (trip === null) {
          console.error('ERROR - cant find fare for trip ' + fareResult.tripId);
          console.log(this.model.trips);
          console.log(fareResult);
          return;
        }

        trip.tripFareResults = fareResult.tripFareResults;
      });
    })
  }

  public loadPreviousTrips() {
    if (this.model.trips.length === 0) {
      return;
    }

    const depArrDate = this.model.trips[0].computeDepartureTime();
    if (depArrDate === null) {
      return;
    }

    this.model.isFetchingPrevTrips = true;

    this.loadTrips('NumberOfResultsBefore', depArrDate);
  }

  public loadNextTrips() {
    if (this.model.trips.length === 0) {
      return;
    }

    const lastTrip = this.model.trips[this.model.trips.length - 1];
    const depArrDate = lastTrip.computeDepartureTime();
    if (depArrDate === null) {
      return;
    }

    this.model.isFetchingNextTrips = true;

    this.loadTrips('NumberOfResultsAfter', depArrDate);
  }

  private loadTrips(numberOfResultsType: NumberOfResultsType, depArrDate: Date) {
    const viaTripLocations = this.userTripService.isViaEnabled ? this.userTripService.viaTripLocations : [];

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
    const request = OJP_Legacy.TripRequest.initWithTripLocationsAndDate(
      stageConfig,
      this.languageService.language,
      this.userTripService.fromTripLocation,
      this.userTripService.toTripLocation,
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

    this.userTripService.journeyTripRequests = [request];

    request.fetchResponse().then(response => {
      const trips = response.trips;
      this.userTripService.updateTrips(trips);

      const requestInfo = request.requestInfo;
      this.userTripService.tripRequestFinished.emit(requestInfo);

      if (trips.length > 0) {
        const firstTrip = trips[0];

        this.userTripService.fetchFares();
      } else {
        this.userTripService.selectActiveTrip(null);
      }
    });
  }

  private updatePageModel(trips: OJP_Legacy.Trip[]) {
    this.model.trips = trips;
    this.model.hasPagination = this.computeHasPagination(trips.length);
    // Update both - TODO - use a completion instead?
    this.model.isFetchingPrevTrips = false;
    this.model.isFetchingNextTrips = false;    
  }
}
