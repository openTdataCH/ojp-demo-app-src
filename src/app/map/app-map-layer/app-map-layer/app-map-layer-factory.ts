import mapboxgl from 'mapbox-gl'

import { AppMapLayerOptions } from '../../../config/app-config'
import { UserTripService } from "../../../shared/services/user-trip.service";

import { AppMapLayer } from "../app-map-layer";

import { ChargingStationAppMapLayer } from "./charging-station-app-map-layer";
import { POIAppMapLayer } from "./poi-app-map-layer";
import { SharedMobilityAppMapLayer } from "./shared-mobility-app-map-layer";
import { StopAppMapLayer } from "./stop-app-map-layer";

export class AppMapLayerFactory {
  public static init(layerKey: string, map: mapboxgl.Map, appMapLayerOptions: AppMapLayerOptions, userTripService: UserTripService): AppMapLayer {
      if (appMapLayerOptions.LIR_Restriction_Type === 'stop') {
          const stopAppMapLayer = new StopAppMapLayer(layerKey, map, appMapLayerOptions, userTripService);
          return stopAppMapLayer;
      }
      if (appMapLayerOptions.LIR_Restriction_Type === 'poi_amenity' && appMapLayerOptions.LIR_POI_Type === 'charging_station') {
          const chargingStationAppMapLayer = new ChargingStationAppMapLayer(layerKey, map, appMapLayerOptions, userTripService);
          return chargingStationAppMapLayer;
      }
      if (appMapLayerOptions.LIR_Restriction_Type === 'poi_amenity') {
          const sharedMobilityAppMapLayer = new SharedMobilityAppMapLayer(layerKey, map, appMapLayerOptions, userTripService);
          return sharedMobilityAppMapLayer;
      }
      if (appMapLayerOptions.LIR_Restriction_Type === 'poi_all') {
          const poiAppMapLayer = new POIAppMapLayer(layerKey, map, appMapLayerOptions, userTripService);
          return poiAppMapLayer;
      }

      const appMapLayer = new AppMapLayer(layerKey, map, appMapLayerOptions, userTripService);
      return appMapLayer;
  }
}
