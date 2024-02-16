import { Component, EventEmitter, Output } from '@angular/core';
import { UserTripService } from 'src/app/shared/services/user-trip.service';

import * as OJP from 'ojp-sdk'

@Component({
  selector: 'input-xml-popover',
  templateUrl: './input-xml-popover.component.html',
})
export class InputXmlPopoverComponent {
  public inputTripRequestXML: string
  public inputTripRequestResponseXML: string

  public isRunningTripRequest: boolean

  @Output() tripCustomRequestSaved = new EventEmitter<string>()
  @Output() tripCustomResponseSaved = new EventEmitter<string>()

  constructor(private userTripService: UserTripService) {
    this.inputTripRequestXML = '... loading'
    this.inputTripRequestResponseXML = 'Paste custom OJP TripRequest Response XML here...'

    this.isRunningTripRequest = false
  }

  public parseCustomRequestXML() {
    this.isRunningTripRequest = true

    const stageConfig = this.userTripService.getStageConfig();
    const request = OJP.TripRequest.initWithRequestMock(this.inputTripRequestXML);
    request.fetchResponse().then(response => {
      if (response.message === 'ERROR') {
        console.error('ERROR fetching OJP response');
        console.log(response);
        return;
      }

      const responseXML = request.requestInfo.responseXML;
      if (responseXML === null) {
        console.error('ERROR parsing OJP response');
        console.log(request);
        return;
      }

      this.tripCustomRequestSaved.emit(responseXML);
    });
  }

  public parseCustomResponseXML() {
    this.tripCustomResponseSaved.emit(this.inputTripRequestResponseXML);
  }
}
