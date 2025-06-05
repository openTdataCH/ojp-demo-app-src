import { Component, EventEmitter, Output } from '@angular/core';
import { UserTripService } from 'src/app/shared/services/user-trip.service';

import OJP_Legacy from '../../../config/ojp-legacy';
import { OJP_VERSION, REQUESTOR_REF } from '../../../config/constants';

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
    this.isRunningRequest = true;
    const isOJPv2 = OJP_VERSION === '2.0';
    const xmlConfig = isOJPv2 ? OJP_Legacy.XML_ConfigOJPv2 : OJP_Legacy.XML_BuilderConfigOJPv1;

    const stageConfig = this.userTripService.getStageConfig();
    const request = OJP_Legacy.StopEventRequest.initWithRequestMock(this.customRequestXMLs, stageConfig, xmlConfig, REQUESTOR_REF);
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
