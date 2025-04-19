import { Component } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';

import * as OJP_Legacy from 'ojp-sdk-v1';
import { XML_Helpers } from 'src/app/helpers/xml-helpers';

@Component({
  selector: 'debug-xml-popover',
  templateUrl: './debug-xml-popover.component.html',
})
export class DebugXmlPopoverComponent {
  public responseXML: string;
  public isTripRequest: boolean;
  
  public requestXML: string;
  private responseXML_Original: string;
  private responseXML_Stripped: string;
  
  private isStrippingTagsEnabled: boolean

  constructor(private clipboard: Clipboard) {
    this.responseXML = 'loading TR...';
    this.isTripRequest = false;
    this.requestXML = 'n/a';
    this.responseXML_Original = 'n/a';
    this.responseXML_Stripped = 'n/a';
    this.isStrippingTagsEnabled = true;
  }

  public updateRequestData(requestInfo: OJP_Legacy.RequestInfo) {
    if (requestInfo.requestXML) {
      this.requestXML = XML_Helpers.prettyPrintXML(requestInfo.requestXML);
    } else {
      this.requestXML = 'n/a (error getting request XML)';
    }

    if (requestInfo.responseXML) {
      this.responseXML_Original = XML_Helpers.prettyPrintXML(requestInfo.responseXML);
      if (this.isTripRequest) {
        // HACK: Quick'n'dirty remove the not-needed nodes, using string replace - XSLT didnt work as expected
        let responseXML_Stripped = this.responseXML_Original.replace(/<LinkProjection>.+?<\/LinkProjection>/gms, '');
        responseXML_Stripped = responseXML_Stripped.replace(/<ojp:LinkProjection>.+?<\/ojp:LinkProjection>/gms, '');
        
        this.responseXML_Stripped = responseXML_Stripped;
      }

      this.updateResponseXML();
    } else {
      this.responseXML = 'loading TR ... or TR is not fetched yet';
    }
  }

  public toggleStripTags() {
    this.isStrippingTagsEnabled = !this.isStrippingTagsEnabled;
    this.updateResponseXML();
  }

  private updateResponseXML() {
    if (this.isTripRequest && this.isStrippingTagsEnabled) {
      this.responseXML = this.responseXML_Stripped;
    } else {
      this.responseXML = this.responseXML_Original;
    }
  }

  public copyTextToClipboard() {
    this.clipboard.copy(this.responseXML);
  }
}
