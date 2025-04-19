import mapboxgl from 'mapbox-gl'
import * as OJP_Legacy from 'ojp-sdk-v1';

import { AppMapLayerOptions } from '../../../config/constants'
import { UserTripService } from "../../../shared/services/user-trip.service";

import { AppMapLayer } from "../app-map-layer";

import { ChargingStationAppMapLayer } from "./charging-station-app-map-layer";
import { POIAppMapLayer } from "./poi-app-map-layer";
import { SharedMobilityAppMapLayer } from "./shared-mobility-app-map-layer";
import { StopAppMapLayer } from "./stop-app-map-layer";

export class AppMapLayerFactory {
  public static init(language: OJP_Legacy.Language, layerKey: string, map: mapboxgl.Map, appMapLayerOptions: AppMapLayerOptions, userTripService: UserTripService): AppMapLayer {
      if (appMapLayerOptions.LIR_Restriction_Type === 'stop') {
          const stopAppMapLayer = new StopAppMapLayer(language, layerKey, map, appMapLayerOptions, userTripService);
          return stopAppMapLayer;
      }

      const isChargingStation = appMapLayerOptions.LIR_POI_Type?.tags.includes('charging_station');
      if (isChargingStation) {
          const chargingStationAppMapLayer = new ChargingStationAppMapLayer(language, layerKey, map, appMapLayerOptions, userTripService);
          return chargingStationAppMapLayer;
      }
      
      const isSharedMobility = appMapLayerOptions.LIR_POI_Type?.poiType === 'shared_mobility';
      if (isSharedMobility) {
          const sharedMobilityAppMapLayer = new SharedMobilityAppMapLayer(language, layerKey, map, appMapLayerOptions, userTripService);
          return sharedMobilityAppMapLayer;
      }
      
      const isPOI_all = appMapLayerOptions.LIR_POI_Type?.poiType === 'poi';
      if (isPOI_all) {
          const poiAppMapLayer = new POIAppMapLayer(language, layerKey, map, appMapLayerOptions, userTripService);
          return poiAppMapLayer;
      }

      const appMapLayer = new AppMapLayer(language, layerKey, map, appMapLayerOptions, userTripService);
      return appMapLayer;
  }
}
