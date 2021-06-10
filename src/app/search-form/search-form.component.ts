import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { UserTripService } from '../shared/services/user-trip.service'

import * as OJP from '../shared/ojp-sdk/index'

@Component({
  selector: 'app-search-form',
  templateUrl: './search-form.component.html',
})
export class SearchFormComponent implements OnInit {
  formGroup: FormGroup

  @Output() tripsResponseCompleted = new EventEmitter<OJP.TripsResponse>();

  private tripRequestParams: OJP.TripsRequestParams | null

  public fromLocationText: string
  public toLocationText: string

  constructor(private userTripService: UserTripService) {
    const nowDate = new Date()
    const timeFormatted = OJP.DateHelpers.formatTimeHHMM(nowDate);

    this.formGroup = new FormGroup({
      date: new FormControl(nowDate),
      time: new FormControl(timeFormatted)
    })

    this.tripRequestParams = null;

    this.fromLocationText = ''
    this.toLocationText = ''
  }

  ngOnInit() {
    this.initLocations()

  }

  private initLocations() {
    const defaultLocationsPlaceRef = {
      "Bern": "8507000",
      "Luzern": "8505000",
      "Zurich": "8503000",
      "Witikon": "8591107",
    }
    const fromPlaceRef = defaultLocationsPlaceRef.Zurich
    const toPlaceRef = defaultLocationsPlaceRef.Bern

    const promises: Promise<OJP.Location[]>[] = [];

    const endpointTypes: OJP.JourneyPointType[] = ['From', 'To']
    endpointTypes.forEach(endpointType => {
      const isFrom = endpointType === 'From'

      const stopPlaceRef = isFrom ? fromPlaceRef : toPlaceRef
      if (isFrom) {
        this.fromLocationText = stopPlaceRef
      } else {
        this.toLocationText = stopPlaceRef
      }

      const locationInformationRequest = OJP.LocationInformationRequest.initWithStopPlaceRef(stopPlaceRef)
      const locationInformationPromise = locationInformationRequest.fetchResponse();
      promises.push(locationInformationPromise)
    });

  }

  onLocationSelected(location: OJP.Location, originType: OJP.JourneyPointType) {
    this.userTripService.updateTripEndpoint(location, originType, 'SearchForm')
    this.updateSearchParams()
  }

  private computeFormDepartureDate(): Date {
    const departureDate = this.formGroup.controls['date'].value as Date;
    const timeParts = this.formGroup.controls['time'].value.split(':');
    if (timeParts.length === 2) {
      const timeHours = parseInt(timeParts[0]);
      const timeMinutes = parseInt(timeParts[1]);

      departureDate.setHours(timeHours);
      departureDate.setMinutes(timeMinutes);
    }

    return departureDate
  }

  updateSearchParams() {
    const departureDate = this.computeFormDepartureDate();
    this.tripRequestParams = OJP.TripsRequestParams.initWithLocationsAndDate(
      this.userTripService.fromLocation,
      this.userTripService.toLocation,
      departureDate
    );
  }

  hasInvalidSearchParams(): boolean {
    return this.tripRequestParams === null
  }

  handleTapOnSearch() {
    if (this.tripRequestParams === null) {
      return
    }

    const tripRequest = new OJP.TripRequest(this.tripRequestParams);
    tripRequest.fetchResponse(tripsResponse => {
      this.tripsResponseCompleted.emit(tripsResponse);
    });
  }
}
