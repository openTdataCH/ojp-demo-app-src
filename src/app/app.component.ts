import { Component, ViewChild } from '@angular/core';
import { SbbAccordion } from '@sbb-esta/angular-business/accordion';

import * as OJP from './shared/ojp-sdk/index'

type SearchState = 'ChooseEndpoints' | 'DisplayTrips'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'ojp-demo-app';
  fromLocation: OJP.Location | null
  toLocation: OJP.Location | null

  tripsResponse: OJP.TripsResponse | null

  trips: OJP.Trip[]

  searchState: SearchState = 'ChooseEndpoints'

  @ViewChild(SbbAccordion, { static: true }) firstAccordion: SbbAccordion | undefined;

  constructor() {
    this.fromLocation = null;
    this.toLocation = null;
    this.tripsResponse = null;
    this.trips = []
    this.firstAccordion = undefined;
  }

  onLocationSelected(location: OJP.Location, originType: OJP.JourneyPointType) {
    if (originType === 'From') {
      this.fromLocation = location
    } else {
      this.toLocation = location
    }
  }

  onTripsResponseCompleted(response: OJP.TripsResponse) {
    this.trips = response.trips
    this.searchState = 'DisplayTrips'
  }

  isChoosingEndpoints(): boolean {
    return this.searchState === 'ChooseEndpoints'
  }
}
