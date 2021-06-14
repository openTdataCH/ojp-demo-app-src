import mapboxgl, { LngLatLike } from "mapbox-gl";
import { UserSettingsService } from "src/app/shared/services/user-settings.service";
import { UserTripService } from "src/app/shared/services/user-trip.service";
import * as OJP from '../../../shared/ojp-sdk/index'
import { MapHelpers } from "../../helpers/map.helpers";
import { MapAppLayer } from "../map-app-layer.interface";

import stopsCircleLayer from './map-layers-def/stops-circle.json';
import stopsLabelLayer from './map-layers-def/stops-label.json'

export class StopsAppLayer implements MapAppLayer {
  private userSettingsService: UserSettingsService
  private userTripService: UserTripService

  private map: mapboxgl.Map
  public minZoomLevel: number
  private sourceId: string

  public features: GeoJSON.Feature[]

  private stopsCircleLayerID = 'stops-circle'
  private stopsLabelLayerID = 'stops-label'

  constructor(map: mapboxgl.Map, userSettingsService: UserSettingsService, userTripService: UserTripService) {
    this.userSettingsService = userSettingsService
    this.userTripService = userTripService

    this.map = map
    this.minZoomLevel = 13.0
    this.sourceId = 'ojp-stops'
    this.features = []
  }

  public addToMap() {
    this.map.addSource(this.sourceId, <mapboxgl.GeoJSONSourceRaw>{
      type: 'geojson',
      data: <GeoJSON.FeatureCollection>{
        'type': 'FeatureCollection',
        'features': []
      }
    });

    const mapLayers = [stopsCircleLayer, stopsLabelLayer]
    stopsCircleLayer.id = this.stopsCircleLayerID;
    stopsLabelLayer.id = this.stopsLabelLayerID;

    mapLayers.forEach(mapLayerDef => {
      mapLayerDef.source = this.sourceId
      this.map.addLayer(mapLayerDef as mapboxgl.AnyLayer);
    });
  }

  public onMapBoundsChange() {
    if (this.map.getZoom() < this.minZoomLevel) {
      this.removeAllFeatures();
      return;
    }

    const mapBounds = this.map.getBounds();
    const stageConfig = this.userSettingsService.getStageConfig();
    const request = OJP.LocationInformationRequest.initWithBBOXAndType(
      stageConfig,
      mapBounds.getWest(),
      mapBounds.getNorth(),
      mapBounds.getEast(),
      mapBounds.getSouth(),
      'stop',
      300
    );

    request.fetchResponse().then(locations => {
      const features: GeoJSON.Feature[] = []

      locations.forEach(location => {
        const feature = location.asGeoJSONFeature();
        if (feature === null) {
          return;
        }

        features.push(feature);
      });

      this.setSourceFeatures(features);
    });
  }

  public queryNearbyFeature(lngLat: mapboxgl.LngLat): mapboxgl.MapboxGeoJSONFeature | null {
    if (this.map.getZoom() < this.minZoomLevel) {
      return null;
    }

    const pointPx = this.map.project(lngLat);
    const bboxWidth = 50;
    const bboxPx: [mapboxgl.PointLike, mapboxgl.PointLike] = [
      [
        pointPx.x - bboxWidth / 2,
        pointPx.y - bboxWidth / 2,
      ],
      [
        pointPx.x + bboxWidth / 2,
        pointPx.y + bboxWidth / 2,
      ]
    ]

    const features = this.map.queryRenderedFeatures(bboxPx, {
      layers: [this.stopsCircleLayerID]
    });

    let minDistance = 1000;
    let closestFeature: mapboxgl.MapboxGeoJSONFeature | null = null
    features.forEach(feature => {
      const featureLngLat = MapHelpers.computePointLngLatFromFeature(feature);
      if (featureLngLat === null) {
        return;
      }

      const featureDistance = lngLat.distanceTo(featureLngLat);
      if (featureDistance < minDistance) {
        closestFeature = feature
        minDistance = featureDistance
      }
    });

    return closestFeature;
  }

  public onMapClick(ev: mapboxgl.MapMouseEvent): boolean {
    if (this.map.getZoom() < this.minZoomLevel) {
      return false;
    }

    const feature = this.queryNearbyFeature(ev.lngLat);
    if (feature) {
      const location = OJP.Location.initWithFeature(feature);
      if (location) {
        this.showPickupPopup(location);
      }

      return true
    }

    return false
  }

  private showPickupPopup(location: OJP.Location) {
    const locationLngLat = location.geoPosition?.asLngLat() ??  null;
    if (locationLngLat === null) { return }

    let popupHTML = (document.getElementById('map-endpoint-stop-picker-popup') as HTMLElement).innerHTML;

    const stopPlaceName = location.stopPlace?.stopPlaceName ?? '';
    popupHTML = popupHTML.replace('[STOP_NAME]', stopPlaceName);

    const stopPlaceRef = location.stopPlace?.stopPlaceRef ?? '';
    popupHTML = popupHTML.replace('[STOP_ID]', stopPlaceRef);

    const popupContainer = document.createElement('div');
    popupContainer.innerHTML = popupHTML;

    const popup = new mapboxgl.Popup({
      focusAfterOpen: false,
    });

    popupContainer.addEventListener('click', ev => {
      const btnEl = ev.target as HTMLButtonElement;
      const endpointType = btnEl.getAttribute('data-endpoint-type') as OJP.JourneyPointType;
      if (endpointType === null) {
        return;
      }

      this.userTripService.updateTripEndpoint(location, endpointType, 'MapPopupClick');

      popup.remove();
    });

    popup.setLngLat(locationLngLat)
      .setDOMContent(popupContainer)
      .addTo(this.map);
  }

  private removeAllFeatures() {
    // Prevent firing again the 'idle' event when setting empty features
    //    on a already empty source
    const hasNoFeatures = this.features.length === 0;
    if (hasNoFeatures) {
      return;
    }

    this.setSourceFeatures([]);
  }

  private setSourceFeatures(features: GeoJSON.Feature[]) {
    this.features = features;

    const source = this.map.getSource(this.sourceId) as mapboxgl.GeoJSONSource
    const featureCollection = <GeoJSON.FeatureCollection>{
      'type': 'FeatureCollection',
      'features': features
    }
    source.setData(featureCollection)
  }
}
