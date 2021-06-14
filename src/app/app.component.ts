import { Component, OnInit, ViewChild } from '@angular/core';
import { SbbAccordion } from '@sbb-esta/angular-business/accordion';

import * as OJP from './shared/ojp-sdk/index'
import { UserTripService } from './shared/services/user-trip.service';

type SearchState = 'ChooseEndpoints' | 'DisplayTrips'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'ojp-demo-app';

  tripsResponse: OJP.TripsResponse | null

  trips: OJP.Trip[]

  searchState: SearchState = 'ChooseEndpoints'

  @ViewChild(SbbAccordion, { static: true }) firstAccordion: SbbAccordion | undefined;

  constructor(private userTripService: UserTripService) {
    this.tripsResponse = null;
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
  }

  onTripsResponseCompleted(response: OJP.TripsResponse) {
    this.trips = response.trips
    this.searchState = 'DisplayTrips'
  }

  isChoosingEndpoints(): boolean {
    return this.searchState === 'ChooseEndpoints'
  }
}
