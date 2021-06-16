import mapboxgl from "mapbox-gl";
import { MapHelpers } from "../helpers/map.helpers";

import { UserSettingsService } from "src/app/shared/services/user-settings.service";
import { UserTripService } from "src/app/shared/services/user-trip.service";

import * as OJP from '../../shared/ojp-sdk/index'

export class LocationMapAppLayer {
  public map: mapboxgl.Map

  public geoRestrictionType: OJP.GeoRestrictionType
  public layerKey: string
  public minZoomLevel: number
  public sourceId: string
  public features: GeoJSON.Feature[]
  public isEnabled: boolean

  private userSettingsService: UserSettingsService
  protected userTripService: UserTripService

  constructor(map: mapboxgl.Map, geoRestrictionType: OJP.GeoRestrictionType, layerKey: string, minZoomLevel: number, sourceId: string, userSettingsService: UserSettingsService, userTripService: UserTripService) {
    this.map = map

    this.geoRestrictionType = geoRestrictionType
    this.layerKey = layerKey
    this.minZoomLevel = minZoomLevel
    this.sourceId = sourceId
    this.features = []

    this.isEnabled = true

    this.userSettingsService = userSettingsService
    this.userTripService = userTripService
  }

  public addToMap() {
    // override
  }

  public onMapBoundsChange() {
    if (!this.isEnabled) {
      return
    }

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
      this.geoRestrictionType,
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

  enable() {
    this.isEnabled = true;
    this.onMapBoundsChange();
  }

  disable() {
    this.isEnabled = false;
    this.removeAllFeatures();
  }

  protected createSourceAddMapLayers(mapLayers: mapboxgl.Layer[]) {
    this.map.addSource(this.sourceId, <mapboxgl.GeoJSONSourceRaw>{
      type: 'geojson',
      data: <GeoJSON.FeatureCollection>{
        'type': 'FeatureCollection',
        'features': []
      }
    });

    mapLayers.forEach(mapLayerDef => {
      mapLayerDef.source = this.sourceId
      this.map.addLayer(mapLayerDef as mapboxgl.AnyLayer);
    });
  }

  protected removeAllFeatures() {
    // Prevent firing again the 'idle' event when setting empty features
    //    on a already empty source
    const hasNoFeatures = this.features.length === 0;
    if (hasNoFeatures) {
      return;
    }

    this.setSourceFeatures([]);
  }

  protected setSourceFeatures(features: GeoJSON.Feature[]) {
    this.features = features;

    const source = this.map.getSource(this.sourceId) as mapboxgl.GeoJSONSource
    const featureCollection = <GeoJSON.FeatureCollection>{
      'type': 'FeatureCollection',
      'features': features
    }
    source.setData(featureCollection)
  }

  protected queryNearbyFeatureByLayerIDs(lngLat: mapboxgl.LngLat, layerIDs: string[]): mapboxgl.MapboxGeoJSONFeature | null {
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
      layers: layerIDs
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

  protected onMapClickByLayerIDs(lngLat: mapboxgl.LngLat, layerIDs: string[]): boolean {
    if (this.map.getZoom() < this.minZoomLevel) {
      return false;
    }

    const feature = this.queryNearbyFeatureByLayerIDs(lngLat, layerIDs);
    if (feature) {
      const location = OJP.Location.initWithFeature(feature);
      if (location) {
        this.showPickupPopup(location);
      }

      return true
    }

    return false
  }

  protected computePopupHTML(location: OJP.Location): string {
    let popupHTML = (document.getElementById('map-endpoint-picker-popup') as HTMLElement).innerHTML;

    const stopPlaceName = location.stopPlace?.stopPlaceName ?? '';
    popupHTML = popupHTML.replace('[GEO_RESTRICTION_TYPE]', this.geoRestrictionType);

    const featureProperties = location.asGeoJSONFeature()?.properties ?? null
    if (featureProperties) {
      const tableTRs: string[] = []
      for (let key in featureProperties){
        const value = featureProperties[key];
        const tableTR = '<tr><td>' + key + '</td><td>' + value + '</td></tr>';
        tableTRs.push(tableTR)
      }

      const tableHTML = '<table class="table">' + tableTRs.join('') + '</table>'
      popupHTML = popupHTML.replace('[GEOJSON_PROPERTIES_TABLE]', tableHTML);
    }

    return popupHTML
  }

  public showPickupPopup(location: OJP.Location) {
    const locationLngLat = location.geoPosition?.asLngLat() ??  null;
    if (locationLngLat === null) { return }

    const popupHTML = this.computePopupHTML(location)

    const popupContainer = document.createElement('div');
    popupContainer.innerHTML = popupHTML;

    const popup = new mapboxgl.Popup({
      focusAfterOpen: false,
      maxWidth: '400px'
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
}