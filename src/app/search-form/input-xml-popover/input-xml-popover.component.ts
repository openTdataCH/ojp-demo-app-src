import { Component, EventEmitter, Output } from '@angular/core';
import { UserTripService } from 'src/app/shared/services/user-trip.service';

import * as OJP from '../../shared/ojp-sdk/index'

@Component({
  selector: 'input-xml-popover',
  templateUrl: './input-xml-popover.component.html',
})
export class InputXmlPopoverComponent {
  public inputTripRequestXmlS: string
  public inputTripRequestResponseXmlS: string

  public isRunningTripRequest: boolean

  @Output() tripCustomRequestSaved = new EventEmitter<string>()
  @Output() tripCustomResponseSaved = new EventEmitter<string>()

  constructor(private userTripService: UserTripService) {
    this.inputTripRequestXmlS = '... loading'
    this.inputTripRequestResponseXmlS = 'Paste custom OJP TripRequest Response XML here...'

    this.isRunningTripRequest = false
  }

  public parseCustomRequestXML() {
    this.isRunningTripRequest = true

    const stageConfig = this.userTripService.getStageConfig()
    const ojpRequest = new OJP.OJPBaseRequest(stageConfig)
    ojpRequest.fetchOJPResponse(this.inputTripRequestXmlS, responseText => {
      this.isRunningTripRequest = false
      this.tripCustomRequestSaved.emit(responseText)
    });
  }

  public parseCustomResponseXML() {
    this.tripCustomResponseSaved.emit(this.inputTripRequestResponseXmlS)
  }
}
