import { Component, OnInit } from '@angular/core';

import OJP_Legacy from '../../config/ojp-legacy';
import * as OJP_Next from 'ojp-sdk-next';

import { DEBUG_LEVEL, MAP_RASTER_LAYERS, OJP_VERSION } from '../../config/constants';
import { RasterLayerType } from '../types/_all';

type PageModel = {
  sdkVersionText: string,
  lastUpdate: string,
  isTopograhicPlaceMapLayerEnabled: boolean,
  changelogURL: string,
  rasterLayers: RasterLayerType[],
}

@Component({
  selector: 'web-footer',
  templateUrl: './web-footer.html',
})
export class WebFooterComponent implements OnInit {
  public model: PageModel;

  constructor() {
    const isTopograhicPlaceMapLayerEnabled = DEBUG_LEVEL === 'DEBUG';

    const changelogURL = 'https://github.com/openTdataCH/ojp-demo-app-src/blob/main/CHANGELOG.md';

    this.model = {
      sdkVersionText: 'ojp-sdk-legacy: ' + OJP_Legacy.SDK_VERSION + ' - ojp-sdk-next: ' + OJP_Next.SDK_VERSION + ' - OJP API ' + OJP_VERSION,
      lastUpdate: '11.August 2025',
      isTopograhicPlaceMapLayerEnabled: isTopograhicPlaceMapLayerEnabled,
      changelogURL: changelogURL,
      rasterLayers: MAP_RASTER_LAYERS,
    }
    
    // Disable all-together (i.e. the feature is not ready yet)
    // this.model.isTopograhicPlaceMapLayerEnabled = false;
  }

  ngOnInit() {

  }
}
