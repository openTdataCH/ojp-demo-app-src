import { Component, OnInit } from '@angular/core';
import { UserTripService } from 'src/app/shared/services/user-trip.service';

import * as OJP from 'ojp-sdk'
import { MapService } from '../../shared/services/map.service'
import { LanguageService } from '../../shared/services/language.service';

interface PageModel {
  trips: OJP.Trip[]
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

  private loadTrips(numberOfResultsType: OJP.NumberOfResultsType, depArrDate: Date) {
    const viaTripLocations = this.userTripService.isViaEnabled ? this.userTripService.viaTripLocations : [];

    const numberOfResults: number | null = (() => {
      const hasPublicTransport = this.userTripService.hasPublicTransport();
      
      return hasPublicTransport ? 5 : null;
    })();

    const stageConfig = this.userTripService.getStageConfig();
    const request = OJP.TripRequest.initWithTripLocationsAndDate(
      stageConfig,
      this.languageService.language,
      this.userTripService.fromTripLocation,
      this.userTripService.toTripLocation,
      depArrDate,
      this.userTripService.currentBoardingType,
      numberOfResultsType,
      true,
      this.userTripService.tripModeTypes[0],
      this.userTripService.tripTransportModes[0],
      viaTripLocations,
      numberOfResults,
    );

    if (request === null) {
      return;
    }

    this.userTripService.journeyTripRequests = [request];

    request.fetchResponse().then(response => {
      const trips = response.trips;
      this.userTripService.updateTrips(trips);

      const requestInfo = request.requestInfo;
      this.userTripService.tripRequestFinished.emit(requestInfo);

      if (trips.length > 0) {
        const firstTrip = trips[0];

        this.userTripService.selectActiveTrip(firstTrip);
        this.mapService.zoomToTrip(firstTrip);

        this.userTripService.fetchFares();
      } else {
        this.userTripService.selectActiveTrip(null);
      }
    });
  }

  private updatePageModel(trips: OJP.Trip[]) {
    this.model.trips = trips;
    this.model.hasPagination = this.computeHasPagination(trips.length);
    // Update both - TODO - use a completion instead?
    this.model.isFetchingPrevTrips = false;
    this.model.isFetchingNextTrips = false;    
  }
}
