import mapboxgl from "mapbox-gl";

import { UserSettingsService } from "../../../../shared/services/user-settings.service";
import { UserTripService } from "../../../../shared/services/user-trip.service";
import * as OJP from '../../../../shared/ojp-sdk/index'

import { LocationMapAppLayer } from '../../location-map-app-layer'
import { MapAppLayer } from "../../map-app-layer.interface";

import bikeSharingStationSymbolLayer from './map-layers-def/bike-sharing-stations-icon.json';

export class BikeSharingStationsLayer extends LocationMapAppLayer implements MapAppLayer {
  public static layerKey = 'bike-sharing-stations'
  public static geoRestrictionType: OJP.GeoRestrictionType = 'poi'
  public static minZoomLevel = 12.0
  public static sourceId = 'ojp-bike-sharing-stations'

  private poiCircleLayerID = 'ojp-bike-sharing-stations-circle'

  private allFeatures: GeoJSON.Feature[]

  constructor(map: mapboxgl.Map, userSettingsService: UserSettingsService, userTripService: UserTripService) {
    super(
      map, BikeSharingStationsLayer.geoRestrictionType,
      BikeSharingStationsLayer.layerKey,
      BikeSharingStationsLayer.minZoomLevel,
      BikeSharingStationsLayer.sourceId,
      userSettingsService,
      userTripService
    )

    this.allFeatures = []
  }

  public addToMap() {
    bikeSharingStationSymbolLayer.id = this.poiCircleLayerID;
    bikeSharingStationSymbolLayer.minzoom = this.minZoomLevel

    const mapLayers = [bikeSharingStationSymbolLayer]
    this.createSourceAddMapLayers(mapLayers as mapboxgl.Layer[])

    this.loadData();
  }

  private loadData() {
    let mockURL = 'https://www.webgis.ro/tmp/cors-proxy?url=https://sharedmobility.ch/station_information.json'

    const responsePromise = fetch(mockURL);
    responsePromise.then(response => {
      response.json().then(responseJSON => {
        const stationsData: any[] = responseJSON['data']['stations'];
        const features: GeoJSON.Feature[] = []

        stationsData.forEach(stationData => {
          const providerID: string = stationData.provider_id;
          const isDonkey = providerID.startsWith('donkey_');
          if (!isDonkey) {
            return;
          }

          const featureProperties: GeoJSON.GeoJsonProperties = {
            "name": stationData.name,
            "provider_id": stationData.provider_id,
            "region_id": stationData.region_id,
            "station_id": stationData.station_id,
          }

          const featureGeometry: GeoJSON.Point = {
            "type": "Point",
            "coordinates": [stationData.lon, stationData.lat]
          }

          const feature: GeoJSON.Feature<GeoJSON.Point> = {
            "type": "Feature",
            "properties": featureProperties,
            "geometry": featureGeometry
          }

          features.push(feature)
        })

        this.allFeatures = features;

        if (!this.shouldIgnoreRefreshingFeatures()) {
          this.setSourceFeatures(features.slice());
        }
      })
    });
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

  refreshFeatures() {
    if (this.shouldIgnoreRefreshingFeatures()) {
      return
    }

    this.setSourceFeatures(this.allFeatures.slice())
  }
}
