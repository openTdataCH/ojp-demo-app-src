import { Component } from '@angular/core';

import * as OJP from 'ojp-sdk-v1';

@Component({
  selector: 'embed-station-board-popover',
  templateUrl: './embed-station-board-popover.component.html',
})
export class EmbedStationBoardPopoverComponent {
  public embedHTMLs: string = 'n/a'
  
  constructor() {

  }

  public updateEmbedHTML(selectedLocation: OJP.Location) {
    const stopRef = selectedLocation.stopPlace?.stopPlaceRef ?? 'n/a';

    const embedLinkRelativeURL = document.location.pathname.replace('/board', '/embed/board') + '?stop_id=' +  stopRef;
    const embedURL = document.location.protocol + '//' + document.location.host + embedLinkRelativeURL;

    this.embedHTMLs = '<iframe src="' + embedURL + '" width="100%" height="100%" frameBorder="0"></iframe>';
  }
}
