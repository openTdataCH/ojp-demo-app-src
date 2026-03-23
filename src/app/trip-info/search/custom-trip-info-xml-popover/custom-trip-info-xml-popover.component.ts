import { Component, EventEmitter, Output } from '@angular/core';

import * as OJP from 'ojp-sdk';

import { UserTripService } from 'src/app/shared/services/user-trip.service';
import { LanguageService } from '../../../shared/services/language.service';
import { APP_STAGE, DEFAULT_APP_STAGE } from '../../../config/constants';

@Component({
  selector: 'custom-trip-info-popover',
  templateUrl: './custom-trip-info-xml-popover.component.html',
})
export class CustomTripInfoXMLPopoverComponent {
  public appStage: APP_STAGE;

  public customRequestXMLs: string;
  public customResponseXMLs: string;

  public isRunningRequest: boolean;

  @Output() customRequestSaved = new EventEmitter<OJP.RequestInfo>();
  @Output() customResponseSaved = new EventEmitter<string>();

  constructor(private userTripService: UserTripService, private languageService: LanguageService) {
    this.appStage = DEFAULT_APP_STAGE;

    this.customRequestXMLs = '... wait';
    this.customResponseXMLs = 'Paste custom OJP TripInfoRequest Response XML here...';

    this.isRunningRequest = false;
  }

  public async parseCustomRequestXML() {
    this.isRunningRequest = true;

    const ojpSDK = this.userTripService.createOJP_SDK_Instance(this.languageService.language, this.appStage);
    const request = ojpSDK.requests.TripInfoRequest.initWithRequestMock(this.customRequestXMLs);
    
    this.isRunningRequest = true;
    await request.fetchResponse(ojpSDK);
    this.isRunningRequest = false;

    if (request.requestInfo.responseXML !== null) {
      this.customRequestSaved.emit(request.requestInfo);
    } else {
      console.log('ERROR - no response from StopEventRequest');
    }
  }

  public parseCustomResponseXML() {
    this.customResponseSaved.emit(this.customResponseXMLs)
  }
}
