import { Component, EventEmitter, Output } from '@angular/core';
import { UserTripService } from 'src/app/shared/services/user-trip.service';

import * as OJP from 'ojp-sdk'

@Component({
  selector: 'custom-stop-event-popover',
  templateUrl: './custom-stop-event-xml-popover.component.html',
})
export class CustomStopEventXMLPopoverComponent {
  public customRequestXMLs: string
  public customResponseXMLs: string

  public isRunningRequest: boolean

  @Output() customRequestSaved = new EventEmitter<string>()
  @Output() customResponseSaved = new EventEmitter<string>()

  constructor(private userTripService: UserTripService) {
    this.customRequestXMLs = '... wait'
    this.customResponseXMLs = 'Paste custom OJP StopEventRequest Response XML here...'

    this.isRunningRequest = false
  }

  public parseCustomRequestXML() {
    this.isRunningRequest = true

    const request = OJP.StopEventRequest.initWithRequestMock(this.customRequestXMLs);
    request.fetchResponse().then(response => {
      this.isRunningRequest = false;
      const responseXML = request.requestInfo.responseXML;
      if (responseXML === null) {
        console.log('ERROR - no response from StopEventRequest');
        return;
      }

      this.customRequestSaved.emit(responseXML);
    });
  }

  public parseCustomResponseXML() {
    this.customResponseSaved.emit(this.customResponseXMLs)
  }
}
