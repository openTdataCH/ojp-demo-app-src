import { Component } from '@angular/core';
import * as OJP from '../../shared/ojp-sdk/index'

@Component({
  selector: 'debug-xml-popover',
  templateUrl: './debug-xml-popover.component.html',
})
export class DebugXmlPopoverComponent {
  public requestXmlS: string
  public responseXmlS: string

  constructor() {
    this.requestXmlS = 'n/a'
    this.responseXmlS = 'n/a'
  }

  updateRequestData(requestData: OJP.RequestData | null) {
    if (requestData && requestData.requestXmlS) {
      this.requestXmlS = OJP.XML_Helpers.prettyPrintXML(requestData.requestXmlS)
    } else {
      this.requestXmlS = 'n/a'
    }

    if (requestData && requestData.responseXmlS) {
      this.responseXmlS = OJP.XML_Helpers.prettyPrintXML(requestData.responseXmlS)
    } else {
      this.responseXmlS = 'n/a'
    }
  }
}
