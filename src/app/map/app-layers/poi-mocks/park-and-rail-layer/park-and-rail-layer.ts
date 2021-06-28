import mapboxgl from "mapbox-gl";

import { UserSettingsService } from "../../../../shared/services/user-settings.service";
import { UserTripService } from "../../../../shared/services/user-trip.service";
import * as OJP from '../../../../shared/ojp-sdk/index'

import { LocationMapAppLayer } from '../../location-map-app-layer'
import { MapAppLayer } from "../../map-app-layer.interface";

import parkAndRailSymbolLayer from './map-layers-def/poi-park-and-rail-icon.json';
import parkAndRailLabelLayer from './map-layers-def/poi-park-and-rail-label.json';
import { MapPoiPropertiesEnum, MapPoiTypeEnum } from "../../map-poi-type-enum";

export class ParkAndRailLayer extends LocationMapAppLayer implements MapAppLayer {
  public static layerKey = 'park-and-rail'
  public static geoRestrictionType: OJP.GeoRestrictionType = 'poi'
  public static minZoomLevel = 10.0
  public static sourceId = 'ojp-park-and-rail'

  private poiCircleLayerID = 'park-and-rail-circle'

  private allFeatures: GeoJSON.Feature[]

  constructor(map: mapboxgl.Map, userSettingsService: UserSettingsService, userTripService: UserTripService) {
    super(
      map, ParkAndRailLayer.geoRestrictionType,
      ParkAndRailLayer.layerKey,
      ParkAndRailLayer.minZoomLevel,
      ParkAndRailLayer.sourceId,
      userSettingsService,
      userTripService
    )

    this.allFeatures = []
  }

  public addToMap() {
    parkAndRailSymbolLayer.id = this.poiCircleLayerID;
    parkAndRailSymbolLayer.minzoom = this.minZoomLevel
    parkAndRailLabelLayer.id = this.poiCircleLayerID + '-label'

    const mapLayers = [parkAndRailSymbolLayer, parkAndRailLabelLayer]
    this.createSourceAddMapLayers(mapLayers as mapboxgl.Layer[])

    this.loadData();
  }

  private loadData() {
    let mockURL = 'https://www.webgis.ro/tmp/cors-proxy?url=https://www.sbb.ch/en/station-services/at-the-station/parking-station/park-and-rail.html'

    const responsePromise = fetch(mockURL);
    responsePromise.then(response => {
      response.text().then(responseText => {
        const doc = new DOMParser().parseFromString(responseText, 'text/html');
        const mapDataDivs = doc.querySelectorAll("div[data-init='mapboxmap']")
        if (mapDataDivs.length !== 1) {
          console.error('Cant find data-init');
          return;
        }

        const mapDataS = mapDataDivs[0].getAttribute('data-mapboxmap-options')
        if (mapDataS === null) {
          console.error('Broken data-mapboxmap-options');
          console.log(mapDataDivs[0]);
          return;
        }

        const features: GeoJSON.Feature[] = []

        const mapDataJSON = JSON.parse(mapDataS);
        const markers: any[] = mapDataJSON.markers
        markers.forEach(markerData => {
          const featureProperties: GeoJSON.GeoJsonProperties = {
            "id": markerData.id,
            "label": markerData.label,
            "url": 'https://www.sbb.ch/' + markerData.url,
          }

          featureProperties[MapPoiPropertiesEnum.PoiType] = MapPoiTypeEnum.ParkAndRail

          const featureGeometry: GeoJSON.Point = {
            "type": "Point",
            "coordinates": [markerData.lng, markerData.lat]
          }

          const feature: GeoJSON.Feature<GeoJSON.Point> = {
            "type": "Feature",
            "properties": featureProperties,
            "geometry": featureGeometry
          }

          features.push(feature)
        })

        this.allFeatures = features

        if (!this.shouldIgnoreRefreshingFeatures()) {
          this.setSourceFeatures(features.slice());
        }
      })
    })
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
