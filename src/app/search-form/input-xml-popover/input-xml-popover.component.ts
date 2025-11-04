import { Component, EventEmitter, Output } from '@angular/core';

import * as OJP_Next from 'ojp-sdk-next';
import OJP_Legacy from '../../config/ojp-legacy';

import { REQUESTOR_REF, OJP_VERSION } from '../../config/constants';

import { UserTripService } from '../../shared/services/user-trip.service';
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

    this.isRunningTripRequest = false;
  }

  public parseCustomRequestXML() {
    this.isRunningTripRequest = true;

    const isOJPv2 = OJP_VERSION === '2.0';
    const xmlConfig = isOJPv2 ? OJP_Next.DefaultXML_Config : OJP_Next.XML_BuilderConfigOJPv1;

    this.userTripService.selectActiveTrip(null);
    
    const stageConfig = this.userTripService.getStageConfig();
    const request = OJP_Legacy.TripRequest.initWithRequestMock(stageConfig, this.inputTripRequestXML, xmlConfig, REQUESTOR_REF);
    request.fetchResponse().then(response => {
      this.isRunningTripRequest = false;

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
