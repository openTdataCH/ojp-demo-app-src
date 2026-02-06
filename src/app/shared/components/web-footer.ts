import { Component, OnInit } from '@angular/core';

import * as OJP_Types from 'ojp-shared-types';
import * as OJP from 'ojp-sdk';

import { DEBUG_LEVEL, MAP_RASTER_LAYERS, OJP_VERSION } from '../../config/constants';
import { RasterLayerType } from '../types/_all';

type PageModel = {
  lastUpdate: string,
  isTopograhicPlaceMapLayerEnabled: boolean,
  rasterLayers: RasterLayerType[],
  mapSDK_Versions: {
    ojp: string,
    ojpSharedTypes: string,
    ojpAPI: OJP.OJP_VERSION,
  },
  mapChangelogURLs: {
    ojpDemoApp: string,
    ojpSDK: string,
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
      lastUpdate: '6.Feb 2026',
      isTopograhicPlaceMapLayerEnabled: isTopograhicPlaceMapLayerEnabled,
      rasterLayers: MAP_RASTER_LAYERS,
      mapSDK_Versions: {
        ojp: OJP.SDK_VERSION,
        ojpSharedTypes: OJP_Types.VERSION,
        ojpAPI: OJP_VERSION,
      },
      mapChangelogURLs: {
        ojpDemoApp: 'https://github.com/openTdataCH/ojp-demo-app-src/blob/main/CHANGELOG.md',
        ojpSDK: 'https://github.com/openTdataCH/ojp-js/blob/main/CHANGELOG.md',
        ojpSDK_SharedTypes: 'https://github.com/openTdataCH/ojp-shared-types/blob/main/CHANGELOG.md',
      },
    }
    
    // Disable all-together (i.e. the feature is not ready yet)
    // this.model.isTopograhicPlaceMapLayerEnabled = false;
  }

  ngOnInit() {

  }
}
