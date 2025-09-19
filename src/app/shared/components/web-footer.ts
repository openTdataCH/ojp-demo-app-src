import { Component, OnInit } from '@angular/core';

import OJP_Legacy from '../../config/ojp-legacy';
import * as OJP_Next from 'ojp-sdk-next';
import * as OJP_SharedTypes from 'ojp-shared-types';

import { DEBUG_LEVEL, MAP_RASTER_LAYERS, OJP_VERSION } from '../../config/constants';
import { RasterLayerType } from '../types/_all';

type PageModel = {
  lastUpdate: string,
  isTopograhicPlaceMapLayerEnabled: boolean,
  rasterLayers: RasterLayerType[],
  mapSDK_Versions: {
    ojpLegacy: string,
    ojpNext: string,
    ojpSharedTypes: string,
    ojpAPI: OJP_Legacy.OJP_VERSION_Type,
  },
  mapChangelogURLs: {
    ojpDemoApp: string,
    ojpSDK_Legacy: string,
    ojpSDK_Next: string,
    ojpSDK_SharedTypes: string,
  }
};

@Component({
  selector: 'web-footer',
  templateUrl: './web-footer.html',
})
export class WebFooterComponent implements OnInit {
  public model: PageModel;

  constructor() {
    const isTopograhicPlaceMapLayerEnabled = DEBUG_LEVEL === 'DEBUG';

    this.model = {
      lastUpdate: '19.Sep 2025',
      isTopograhicPlaceMapLayerEnabled: isTopograhicPlaceMapLayerEnabled,
      rasterLayers: MAP_RASTER_LAYERS,
      mapSDK_Versions: {
        ojpLegacy: OJP_Legacy.SDK_VERSION,
        ojpNext: OJP_Next.SDK_VERSION,
        ojpSharedTypes: OJP_SharedTypes.VERSION,
        ojpAPI: OJP_VERSION,
      },
      mapChangelogURLs: {
        ojpDemoApp: 'https://github.com/openTdataCH/ojp-demo-app-src/blob/main/CHANGELOG.md',
        ojpSDK_Legacy: 'https://github.com/openTdataCH/ojp-js/blob/main/CHANGELOG.md',
        ojpSDK_Next: 'https://github.com/openTdataCH/ojp-js/blob/feature/ojp-sdk-next/CHANGELOG.md',
        ojpSDK_SharedTypes: 'https://github.com/openTdataCH/ojp-shared-types/blob/main/CHANGELOG.md',
      },
    }
    
    // Disable all-together (i.e. the feature is not ready yet)
    // this.model.isTopograhicPlaceMapLayerEnabled = false;
  }

  ngOnInit() {

  }
}
