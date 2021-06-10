import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

import * as OJP from '../shared/ojp-sdk/index'

@Component({
  selector: 'app-search-form',
  templateUrl: './search-form.component.html',
})
export class SearchFormComponent implements OnInit {
  formGroup: FormGroup

  private fromLocation: OJP.Location | null
  private toLocation: OJP.Location | null

  @Output() fromLocationSelected = new EventEmitter<OJP.Location>();
  @Output() toLocationSelected = new EventEmitter<OJP.Location>();
  @Output() tripsResponseCompleted = new EventEmitter<OJP.TripsResponse>();

  private tripRequestParams: OJP.TripsRequestParams | null

  constructor() {
  public fromLocationText: string
  public toLocationText: string

    const nowDate = new Date()
    const timeFormatted = OJP.DateHelpers.formatTimeHHMM(nowDate);

    this.formGroup = new FormGroup({
      date: new FormControl(nowDate),
      time: new FormControl(timeFormatted)
    })

    this.tripRequestParams = null;
    this.fromLocation = null;
    this.toLocation = null;

    this.fromLocationText = ''
    this.toLocationText = ''
  }

  ngOnInit() {}

  onLocationSelected(location: OJP.Location, originType: OJP.JourneyPointType) {
    if (originType === 'From') {
      this.fromLocationSelected.emit(location)
      this.fromLocation = location
    } else {
      this.toLocationSelected.emit(location)
      this.toLocation = location
    }

    this.updateSearchParams()
  }

  updateSearchParams() {
    const departureDate = this.formGroup.controls['date'].value as Date;
    const timeParts = this.formGroup.controls['time'].value.split(':');
    if (timeParts.length === 2) {
      const timeHours = parseInt(timeParts[0]);
      const timeMinutes = parseInt(timeParts[1]);

      departureDate.setHours(timeHours);
      departureDate.setMinutes(timeMinutes);
    }

    this.tripRequestParams = OJP.TripsRequestParams.initWithLocationsAndDate(this.fromLocation, this.toLocation, departureDate);
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
