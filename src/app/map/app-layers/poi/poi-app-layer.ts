import mapboxgl from "mapbox-gl";

import { UserSettingsService } from "src/app/shared/services/user-settings.service";
import { UserTripService } from "src/app/shared/services/user-trip.service";
import * as OJP from '../../../shared/ojp-sdk/index'

import { LocationMapAppLayer } from '../location-map-app-layer'
import { MapAppLayer } from "../map-app-layer.interface";

import poiCircleLayer from './map-layers-def/poi-circle.json';

export class POIAppLayer extends LocationMapAppLayer implements MapAppLayer {
  public static layerKey = 'poi'
  public static geoRestrictionType: OJP.GeoRestrictionType = 'poi'
  public static minZoomLevel = 5.0 // TODO - change later to a higher zoom level
  public static sourceId = 'ojp-poi'

  private poiCircleLayerID = 'poi-circle'

  public isEnabled = true

  constructor(map: mapboxgl.Map, userSettingsService: UserSettingsService, userTripService: UserTripService) {
    super(
      map, POIAppLayer.geoRestrictionType,
      POIAppLayer.layerKey,
      POIAppLayer.minZoomLevel,
      POIAppLayer.sourceId,
      userSettingsService,
      userTripService
    )
  }

  public addToMap() {
    const mapLayers = [poiCircleLayer]
    poiCircleLayer.id = this.poiCircleLayerID;

    this.createSourceAddMapLayers(mapLayers as mapboxgl.Layer[])
  }

  public queryNearbyFeature(lngLat: mapboxgl.LngLat): mapboxgl.MapboxGeoJSONFeature | null {
    const layerIDs = [this.poiCircleLayerID];
    const feature = this.queryNearbyFeatureByLayerIDs(lngLat, layerIDs);
    return feature
  }

  public onMapClick(ev: mapboxgl.MapMouseEvent): boolean {
    const layerIDs = [this.poiCircleLayerID];

    return this.onMapClickByLayerIDs(ev.lngLat, layerIDs)
  }

}
