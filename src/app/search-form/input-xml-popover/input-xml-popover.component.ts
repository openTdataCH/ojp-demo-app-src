import { Component, EventEmitter, Output } from '@angular/core';

import { UserTripService } from '../../shared/services/user-trip.service';
import { LanguageService } from '../../shared/services/language.service';
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

  constructor(private userTripService: UserTripService, private languageService: LanguageService) {
    this.inputTripRequestXML = '... loading'
    this.inputTripRequestResponseXML = 'Paste custom OJP TripRequest Response XML here...'

    this.isRunningTripRequest = false;
  }

  public async parseCustomRequestXML() {
    this.userTripService.mapActiveTripSelected.emit(null);

    const sdk = this.userTripService.createOJP_SDK_Instance(this.languageService.language);
    const request = sdk.requests.TripRequest.initWithRequestMock(this.inputTripRequestXML);

    this.isRunningTripRequest = true;
    const response = await request.fetchResponse(sdk);
    this.isRunningTripRequest = false;

    if (response.ok) {
      const responseXML = request.requestInfo.responseXML;
      if (responseXML) {
        this.tripCustomRequestSaved.emit(responseXML);
      }
    } else {
      console.error('ERROR fetching OJP response');
      console.log(response);
      return;
    }
  }

  public parseCustomResponseXML() {
    this.tripCustomResponseSaved.emit(this.inputTripRequestResponseXML);
  }
}
