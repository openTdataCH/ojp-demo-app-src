import { Component, EventEmitter, Output } from '@angular/core';
import { UserTripService } from 'src/app/shared/services/user-trip.service';

import * as OJP_Next from 'ojp-sdk-next';
import { TripInfoResult } from '../../../shared/models/trip-info-result';
import { REQUESTOR_REF } from '../../../config/constants';
import { LanguageService } from '../../../shared/services/language.service';

@Component({
  selector: 'custom-trip-info-popover',
  templateUrl: './custom-trip-info-xml-popover.component.html',
})
export class CustomTripInfoXMLPopoverComponent {
  public customRequestXMLs: string
  public customResponseXMLs: string

  public isRunningRequest: boolean

  @Output() customRequestSaved = new EventEmitter<OJP_Next.RequestInfo>()
  @Output() customResponseSaved = new EventEmitter<string>()

  constructor(private userTripService: UserTripService, private languageService: LanguageService) {
    this.customRequestXMLs = '... wait'
    this.customResponseXMLs = 'Paste custom OJP TripInfoRequest Response XML here...'

    this.isRunningRequest = false
  }

  public async parseCustomRequestXML() {
    this.isRunningRequest = true

    const request = OJP_Next.TripInfoRequest.initWithRequestMock(this.customRequestXMLs);

    const ojpSDK_Next = this.createOJP_SDK_Instance();
    
    this.isRunningRequest = true;
    await ojpSDK_Next.fetchTripInfoRequestResponse(request);
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

  private createOJP_SDK_Instance(): OJP_Next.SDK {
    const stageConfig = this.userTripService.getStageConfig();    
    const sdk = new OJP_Next.SDK(REQUESTOR_REF, stageConfig, this.languageService.language);
    return sdk;
  }
}
