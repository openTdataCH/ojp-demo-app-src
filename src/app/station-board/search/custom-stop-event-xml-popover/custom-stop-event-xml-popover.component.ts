import { Component, EventEmitter, Output } from '@angular/core';
import { UserTripService } from 'src/app/shared/services/user-trip.service';

import * as OJP_Next from 'ojp-sdk-next';

import { OJP_VERSION } from '../../../config/constants';
import { LanguageService } from '../../../shared/services/language.service';

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

  constructor(private userTripService: UserTripService, private languageService: LanguageService) {
    this.customRequestXMLs = '... wait'
    this.customResponseXMLs = 'Paste custom OJP StopEventRequest Response XML here...'

    this.isRunningRequest = false
  }

  public async parseCustomRequestXML() {
    this.isRunningRequest = true;
    const isOJPv2 = OJP_VERSION === '2.0';
    const xmlConfig = isOJPv2 ? OJP_Next.DefaultXML_Config : OJP_Next.XML_BuilderConfigOJPv1;

    const sdk = this.userTripService.createOJP_SDK_Instance(this.languageService.language);
    const request = sdk.requests.StopEventRequest.initWithRequestMock(this.customRequestXMLs);
    const response = await request.fetchResponse(sdk);

    if (!response.ok) {
      console.log('ERROR - no response from StopEventRequest');
      console.log(request);
      return;
    }

    this.customRequestSaved.emit(request.requestInfo.requestXML ?? 'n/a');
  }

  public parseCustomResponseXML() {
    this.customResponseSaved.emit(this.customResponseXMLs)
  }
}
