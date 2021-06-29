import { Component, OnInit } from '@angular/core';
import { UserTripService } from 'src/app/shared/services/user-trip.service';

import * as OJP from '../../shared/ojp-sdk/index'

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
    this.userTripService.locationUpdated.subscribe(locationData => {
      if (
        (locationData.updateSource === 'MapDragend')
        || (locationData.updateSource === 'MapPopupClick')
      ) {
        this.trips = []
      }
    });

    this.userTripService.tripsUpdated.subscribe(trips => {
      this.trips = trips
    });

    this.userTripService.viaAtIndexRemoved.subscribe(idx => {
      this.trips = []
    });

    this.userTripService.viaAtIndexUpdated.subscribe(viaData => {
      this.trips = []
    });
  }
}
