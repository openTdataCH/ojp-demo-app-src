import { Component, EventEmitter, Output } from '@angular/core';
import { UserTripService } from 'src/app/shared/services/user-trip.service';

import OJP_Legacy from '../../config/ojp-legacy';

import { REQUESTOR_REF } from '../../config/constants';
import { OJP_VERSION } from '../../config/app-config';

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

    this.isRunningTripRequest = false
  }

  public parseCustomRequestXML() {
    this.isRunningTripRequest = true;

    const isOJPv2 = OJP_VERSION === '2.0';
    const xmlConfig = isOJPv2 ? OJP_Legacy.XML_ConfigOJPv2 : OJP_Legacy.XML_BuilderConfigOJPv1;
    
    const request = OJP_Legacy.TripRequest.initWithRequestMock(this.inputTripRequestXML, xmlConfig, REQUESTOR_REF);
    request.fetchResponse().then(response => {
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
