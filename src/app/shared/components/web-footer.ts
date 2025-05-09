import { Component, OnInit } from '@angular/core';

import OJP_Legacy from '../../config/ojp-legacy';
import { DEBUG_LEVEL } from '../../config/constants';

type PageModel = {
  sdkVersion: string,
  lastUpdate: string,
  isTopograhicPlaceMapLayerEnabled: boolean,
  changelogURL: string,
  githubURL: string,
}

@Component({
  selector: 'web-footer',
  templateUrl: './web-footer.html',
})
export class WebFooterComponent implements OnInit {
  public model: PageModel

  constructor() {
    const isTopograhicPlaceMapLayerEnabled = DEBUG_LEVEL === 'DEBUG';

    let changelogURL = 'https://github.com/openTdataCH/ojp-demo-app-src/blob/feature/ojp-v1-beta/CHANGELOG.md';
    if (OJP_Legacy.OJP_VERSION === '2.0') {
      changelogURL = 'https://github.com/openTdataCH/ojp-demo-app-src/blob/feature/ojp-v2-beta/CHANGELOG.md';
    }

    let githubURL = 'https://github.com/openTdataCH/ojp-js/blob/feature/ojp-v1/CHANGELOG.md';
    if (OJP_Legacy.OJP_VERSION === '2.0') {
      githubURL = 'https://github.com/openTdataCH/ojp-js/blob/feature/ojp-v2/CHANGELOG.md';
    }

    this.model = {
      sdkVersion: OJP_Legacy.SDK_VERSION + ', OJP API ' + OJP_Legacy.OJP_VERSION,
      lastUpdate: '09.May 2025',
      isTopograhicPlaceMapLayerEnabled: isTopograhicPlaceMapLayerEnabled,
      changelogURL: changelogURL,
      githubURL: githubURL,
    }
    
    // Disable all-together (i.e. the feature is not ready yet)
    // this.model.isTopograhicPlaceMapLayerEnabled = false;
  }

  ngOnInit() {

  }
}
