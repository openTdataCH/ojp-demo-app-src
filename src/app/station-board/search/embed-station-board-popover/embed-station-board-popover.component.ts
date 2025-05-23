import { Component } from '@angular/core';

import OJP_Legacy from '../../../config/ojp-legacy';

@Component({
  selector: 'embed-station-board-popover',
  templateUrl: './embed-station-board-popover.component.html',
})
export class EmbedStationBoardPopoverComponent {
  public embedHTMLs: string = 'n/a'
  
  constructor() {

  }

  public updateEmbedHTML(selectedLocation: OJP_Legacy.Location) {
    const stopRef = selectedLocation.stopPlace?.stopPlaceRef ?? 'n/a';

    const embedLinkRelativeURL = document.location.pathname.replace('/board', '/embed/board') + '?stop_id=' +  stopRef;
    const embedURL = document.location.protocol + '//' + document.location.host + embedLinkRelativeURL;

    this.embedHTMLs = '<iframe src="' + embedURL + '" width="100%" height="100%" frameBorder="0"></iframe>';
  }
}
