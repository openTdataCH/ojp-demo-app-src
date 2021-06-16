import { Component, OnInit, ViewChild } from '@angular/core';
import { SbbAccordion } from '@sbb-esta/angular-business/accordion';
import { UserTripService } from 'src/app/shared/services/user-trip.service';

import * as OJP from '../../shared/ojp-sdk/index'

type SearchState = 'ChooseEndpoints' | 'DisplayTrips'

@Component({
  selector: 'journey-results',
  templateUrl: './journey-results.component.html',
})
export class JourneyResultsComponent implements OnInit {
  trips: OJP.Trip[]

  searchState: SearchState = 'ChooseEndpoints'

  @ViewChild(SbbAccordion, { static: true }) firstAccordion: SbbAccordion | undefined;

  constructor(private userTripService: UserTripService) {
    this.trips = []
    this.firstAccordion = undefined;
  }

  ngOnInit() {
    this.userTripService.locationUpdated.subscribe(locationData => {
      if (
        (locationData.updateSource === 'MapDragend')
        || (locationData.updateSource === 'MapPopupClick')
      ) {
        this.trips = []
        this.searchState = 'ChooseEndpoints'
      }
    });

    this.userTripService.tripsUpdated.subscribe(trips => {
      this.trips = trips
      this.searchState = 'DisplayTrips'
    });
  }

  isChoosingEndpoints(): boolean {
    return this.searchState === 'ChooseEndpoints'
  }
}
