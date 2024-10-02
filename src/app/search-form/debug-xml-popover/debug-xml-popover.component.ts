import { Component } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';

import * as OJP from 'ojp-sdk'
import { XML_Helpers } from 'src/app/helpers/xml-helpers';

@Component({
  selector: 'debug-xml-popover',
  templateUrl: './debug-xml-popover.component.html',
})
export class DebugXmlPopoverComponent {
  public responseXML: string;
  
  private responseXML_Original: string;
  private responseXML_Stripped: string;
  
  private isStrippingTagsEnabled: boolean

  constructor(private clipboard: Clipboard) {
    this.responseXML = 'loading TR...';
    this.responseXML_Original = 'n/a';
    this.responseXML_Stripped = 'n/a';
    this.isStrippingTagsEnabled = true;
  }

  public updateRequestData(requestInfo: OJP.RequestInfo) {
    if (requestInfo.responseXML) {
      this.responseXML_Original = XML_Helpers.prettyPrintXML(requestInfo.responseXML);
      this.responseXML_Stripped = this.responseXML_Original.replace(/<LinkProjection>.+?<\/LinkProjection>/gms, '');

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
    if (this.isStrippingTagsEnabled) {
      this.responseXML = this.responseXML_Stripped;
    } else {
      this.responseXML = this.responseXML_Original;
    }
  }

  public copyTextToClipboard() {
    this.clipboard.copy(this.responseXML);
  }
}
