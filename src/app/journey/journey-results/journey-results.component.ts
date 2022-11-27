import { Component, OnInit } from '@angular/core';
import { UserTripService } from 'src/app/shared/services/user-trip.service';

import * as OJP from 'ojp-sdk'

@Component({
  selector: 'journey-results',
  templateUrl: './journey-results.component.html',
})
export class JourneyResultsComponent implements OnInit {
  trips: OJP.Trip[]

  constructor(private userTripService: UserTripService) {
    this.trips = []
  }

  ngOnInit() {
    this.userTripService.tripsUpdated.subscribe(trips => {
      this.trips = trips
    });

    this.userTripService.searchParamsReset.subscribe(() => {
      this.trips = []
    });
  }
}
