import { Component, EventEmitter, Output } from '@angular/core';
import { UserTripService } from 'src/app/shared/services/user-trip.service';

import * as OJP from 'ojp-sdk';

import { LanguageService } from '../../../shared/services/language.service';
import { APP_STAGE, DEFAULT_APP_STAGE } from '../../../config/constants';

@Component({
  selector: 'custom-stop-event-popover',
  templateUrl: './custom-stop-event-xml-popover.component.html',
})
export class CustomStopEventXMLPopoverComponent {
  public appStage: APP_STAGE;
  
  public customRequestXMLs: string
  public customResponseXMLs: string

  public isRunningRequest: boolean

  @Output() customRequestSaved = new EventEmitter<OJP.RequestInfo>()
  @Output() customResponseSaved = new EventEmitter<string>()

  constructor(private userTripService: UserTripService, private languageService: LanguageService) {
    this.appStage = DEFAULT_APP_STAGE;

    this.customRequestXMLs = '... wait'
    this.customResponseXMLs = 'Paste custom OJP StopEventRequest Response XML here...'

    this.isRunningRequest = false
  }

  public async parseCustomRequestXML() {
    const sdk = this.userTripService.createOJP_SDK_Instance(this.languageService.language, this.appStage);
    const request = sdk.requests.StopEventRequest.initWithRequestMock(this.customRequestXMLs);
    
    this.isRunningRequest = true;
    const response = await request.fetchResponse(sdk);
    this.isRunningRequest = false;

    if (!response.ok) {
      console.log('ERROR - no response from StopEventRequest');
      console.log(request);
      return;
    }

    this.customRequestSaved.emit(request.requestInfo);
  }

  public parseCustomResponseXML() {
    this.customResponseSaved.emit(this.customResponseXMLs);
  }
}
