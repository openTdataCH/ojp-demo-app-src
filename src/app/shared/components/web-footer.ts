import { Component, OnInit } from '@angular/core';

import * as OJP from 'ojp-sdk'
import { DEBUG_LEVEL } from '../../config/app-config';

type PageModel = {
  sdkVersion: string,
  lastUpdate: string,
  isTopograhicPlaceMapLayerEnabled: boolean
}

@Component({
  selector: 'web-footer',
  templateUrl: './web-footer.html',
})
export class WebFooterComponent implements OnInit {
  public model: PageModel

  constructor() {
    const isTopograhicPlaceMapLayerEnabled = DEBUG_LEVEL === 'DEBUG';

    this.model = {
      sdkVersion: OJP.SDK_VERSION,
      lastUpdate: '06.December 2024',
      isTopograhicPlaceMapLayerEnabled: isTopograhicPlaceMapLayerEnabled,
    }
    
    // Disable all-together (i.e. the feature is not ready yet)
    // this.model.isTopograhicPlaceMapLayerEnabled = false;
  }

  ngOnInit() {

  }
}
