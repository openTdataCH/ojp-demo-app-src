import { Component, OnInit } from '@angular/core';
import { UserTripService } from 'src/app/shared/services/user-trip.service';

import * as OJP from 'ojp-sdk'
import { MapService } from '../../shared/services/map.service'
import { LanguageService } from '../../shared/services/language.service';

@Component({
  selector: 'journey-results',
  templateUrl: './journey-results.component.html',
  styleUrls: ['./journey-results.component.scss'],
})
export class JourneyResultsComponent implements OnInit {
  public trips: OJP.Trip[]
  public isFetchingPrevTrips: boolean
  public isFetchingNextTrips: boolean

  constructor(private userTripService: UserTripService, private mapService: MapService, private languageService: LanguageService) {
    this.trips = []
    this.isFetchingPrevTrips = false;
    this.isFetchingNextTrips = false;
  }

  ngOnInit() {
    this.userTripService.tripsUpdated.subscribe(trips => {
      this.trips = trips
    });

    this.userTripService.searchParamsReset.subscribe(() => {
      this.trips = [];
    });

    this.userTripService.tripFaresUpdated.subscribe(fareResults => {
      this.trips.forEach(trip => {
        trip.tripFareResults = [];
      });

      fareResults.forEach(fareResult => {
        const trip = this.trips.find(trip => {
          return trip.id === fareResult.tripId
        }) ?? null;

        if (trip === null) {
          console.error('ERROR - cant find fare for trip ' + fareResult.tripId);
          console.log(this.trips);
          console.log(fareResult);
          return;
        }

        trip.tripFareResults = fareResult.tripFareResults;
      });
    })
  }

  public loadPreviousTrips() {
    if (this.trips.length === 0) {
      return;
    }

    const depArrDate = this.trips[0].computeDepartureTime();
    if (depArrDate === null) {
      return;
    }

    this.isFetchingPrevTrips = true;

    this.loadTrips('NumberOfResultsBefore', depArrDate);
  }

  public loadNextTrips() {
    if (this.trips.length === 0) {
      return;
    }

    const depArrDate = this.trips[this.trips.length - 1].computeDepartureTime();
    if (depArrDate === null) {
      return;
    }

    this.isFetchingNextTrips = true;

    this.loadTrips('NumberOfResultsAfter', depArrDate);
  }

  private loadTrips(numberOfResultsType: OJP.NumberOfResultsType, depArrDate: Date) {
    const viaTripLocations = this.userTripService.isViaEnabled ? this.userTripService.viaTripLocations : [];

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
    );

    if (request === null) {
      return;
    }

    this.userTripService.journeyTripRequests = [request];

    request.fetchResponse().then(response => {
      // Update both - TODO - use a completion instead?
      this.isFetchingPrevTrips = false;
      this.isFetchingNextTrips = false;

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
}
