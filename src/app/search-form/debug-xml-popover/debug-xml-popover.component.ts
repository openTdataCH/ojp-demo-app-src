import { Component } from '@angular/core';
import * as OJP from 'ojp-sdk'
import { XML_Helpers } from 'src/app/helpers/xml-helpers';

@Component({
  selector: 'debug-xml-popover',
  templateUrl: './debug-xml-popover.component.html',
})
export class DebugXmlPopoverComponent {
  public requestXmlS: string
  public responseXmlS: string

  constructor() {
    this.requestXmlS = 'loading...';
    this.responseXmlS = 'loading...';
  }

  updateRequestData(requestInfo: OJP.RequestInfo) {
    if (requestInfo.requestXML) {
      this.requestXmlS = XML_Helpers.prettyPrintXML(requestInfo.requestXML);
    } else {
      this.requestXmlS = 'n/a';
    }

    if (requestInfo.responseXML) {
      this.responseXmlS = XML_Helpers.prettyPrintXML(requestInfo.responseXML);
    } else {
      this.responseXmlS = 'n/a';
    }
  }
}
