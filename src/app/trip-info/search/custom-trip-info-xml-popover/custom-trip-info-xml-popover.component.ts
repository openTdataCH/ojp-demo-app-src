import { Component, EventEmitter, Output } from '@angular/core';
import { UserTripService } from 'src/app/shared/services/user-trip.service';

import * as OJP from 'ojp-sdk-v1';

@Component({
  selector: 'custom-trip-info-popover',
  templateUrl: './custom-trip-info-xml-popover.component.html',
})
export class CustomTripInfoXMLPopoverComponent {
  public customRequestXMLs: string
  public customResponseXMLs: string

  public isRunningRequest: boolean

  @Output() customRequestSaved = new EventEmitter<OJP.TripInfoRequest>()
  @Output() customResponseSaved = new EventEmitter<string>()

  constructor(private userTripService: UserTripService) {
    this.customRequestXMLs = '... wait'
    this.customResponseXMLs = 'Paste custom OJP TripInfoRequest Response XML here...'

    this.isRunningRequest = false
  }

  public parseCustomRequestXML() {
    this.isRunningRequest = true

    const stageConfig = this.userTripService.getStageConfig();
    const request = OJP.TripInfoRequest.initWithRequestMock(this.customRequestXMLs, stageConfig);
    request.fetchResponse().then(response => {
      this.isRunningRequest = false;
      const responseXML = request.requestInfo.responseXML;
      if (responseXML === null) {
        console.log('ERROR - no response from StopEventRequest');
        return;
      }

      this.customRequestSaved.emit(request);
    });
  }

  public parseCustomResponseXML() {
    this.customResponseSaved.emit(this.customResponseXMLs)
  }
}
