import { Component, OnInit } from '@angular/core';

import OJP_Legacy from '../../config/ojp-legacy';
import * as OJP_Next from 'ojp-sdk-next';

import { DEBUG_LEVEL } from '../../config/constants';
import { OJP_VERSION } from '../../config/app-config';

type PageModel = {
  sdkVersionText: string,
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
    const isOJPv2 = OJP_VERSION === '2.0';

    let changelogURL = 'https://github.com/openTdataCH/ojp-demo-app-src/blob/feature/ojp-v1-beta/CHANGELOG.md';
    if (isOJPv2) {
      changelogURL = 'https://github.com/openTdataCH/ojp-demo-app-src/blob/feature/ojp-v2-beta/CHANGELOG.md';
    }

    let githubURL = 'https://github.com/openTdataCH/ojp-js/blob/feature/ojp-v1/CHANGELOG.md';
    if (isOJPv2) {
      githubURL = 'https://github.com/openTdataCH/ojp-js/blob/feature/ojp-v2/CHANGELOG.md';
    }

    this.model = {
      sdkVersionText: 'ojp-sdk-legacy: ' + OJP_Legacy.SDK_VERSION + ' - ojp-sdk-next: ' + OJP_Next.SDK_VERSION + ' - OJP API ' + OJP_VERSION,
      lastUpdate: '4.June 2025',
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
