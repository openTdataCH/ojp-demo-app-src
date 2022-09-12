import mapboxgl from "mapbox-gl";

import * as OJP from '../../shared/ojp-sdk/index'

import { AppMapLayerOptions, APP_CONFIG } from "src/app/config/app-config";
import { UserTripService } from "src/app/shared/services/user-trip.service";
import { MapHelpers } from "../helpers/map.helpers";
import { MAP_LAYERS_DEFINITIONS } from "./map-layers-def";

export enum FeaturePropsEnum {
    OJP_GeoRestrictionType = 'OJP.GeoRestrictionType',
    OJP_GeoRestrictionPoiOSMTag = 'OJP.GeoRestrictionPoiOSMTag',
}

export class AppMapLayer {
    private layerKey: string

    private map: mapboxgl.Map
    private geoRestrictionType: OJP.GeoRestrictionType
    private geoRestrictionPoiOSMTags: OJP.GeoRestrictionPoiOSMTag[] | null
    public minZoom: number

    private features: GeoJSON.Feature[];
    private mapSourceID: string;
    private userTripService: UserTripService

    public isEnabled: boolean
    public lastOJPRequest: OJP.LocationInformationRequest | null

    constructor(layerKey: string, map: mapboxgl.Map, appMapLayerOptions: AppMapLayerOptions, userTripService: UserTripService) {
        this.layerKey = layerKey;

        this.map = map;
        this.geoRestrictionType = appMapLayerOptions.LIR_Restriction_Type;
        
        if (appMapLayerOptions.LIR_POI_Type) {
            if (Array.isArray(appMapLayerOptions.LIR_POI_Type)) {
                this.geoRestrictionPoiOSMTags = appMapLayerOptions.LIR_POI_Type
            } else {
                this.geoRestrictionPoiOSMTags = [appMapLayerOptions.LIR_POI_Type];
            }
        } else {
            this.geoRestrictionPoiOSMTags = null
        }
        
        this.minZoom = appMapLayerOptions.minZoom;
        this.features = [];
        this.mapSourceID = layerKey + '-map-src';
        this.userTripService = userTripService;

        this.isEnabled = false;
        this.lastOJPRequest = null;

        this.addMapSourceAndLayers();
    }

    private addMapSourceAndLayers() {
        this.map.addSource(this.mapSourceID, <mapboxgl.GeoJSONSourceRaw>{
            type: 'geojson',
            data: <GeoJSON.FeatureCollection>{
                'type': 'FeatureCollection',
                'features': []
            }
        });

        if (!(this.layerKey in APP_CONFIG.map_app_map_layers)) {
            console.error('ERROR - AppMapLayer.addMapSourceAndLayers no layers defined for ' + this.layerKey);
            return;
        }

        const layerIDs = APP_CONFIG.map_app_map_layers[this.layerKey].layer_ids;
        layerIDs.forEach(layerID => {
            if (!(layerID in MAP_LAYERS_DEFINITIONS)) {
                console.error('ERROR - AppMapLayer.addMapSourceAndLayers no layer def for ' + layerID);
                return;
            }
            
            const layerJSON = MAP_LAYERS_DEFINITIONS[layerID];
            const layer = JSON.parse(JSON.stringify(layerJSON)) as mapboxgl.Layer;

            layer.id = layerID;
            layer.source = this.mapSourceID;

            this.map.addLayer(layer as mapboxgl.AnyLayer);
        });
    }

    private shouldLoadNewFeatures(): boolean {
        if (!this.isEnabled) {
            return false;
        }

        if (this.map.getZoom() < this.minZoom) {
            return false
        }
    
        return true
    }

    public refreshFeatures() {
        if (!this.shouldLoadNewFeatures()) {
            this.removeAllFeatures();
            return;
        }

        const mapBounds = this.map.getBounds();
        const stageConfig = this.userTripService.getStageConfig()
        const request = OJP.LocationInformationRequest.initWithBBOXAndType(
            stageConfig,
            mapBounds.getWest(),
            mapBounds.getNorth(),
            mapBounds.getEast(),
            mapBounds.getSouth(),
            this.geoRestrictionType,
            300,
            this.geoRestrictionPoiOSMTags,
        );

        this.lastOJPRequest = request

        request.fetchResponse().then(locations => {
            if (!this.shouldLoadNewFeatures()) {
                this.removeAllFeatures();
            }

            const features: GeoJSON.Feature[] = []

            locations.forEach(location => {
                const feature = this.computeFeatureFromLocation(location);
                if (feature === null) {
                    return;
                }

                features.push(feature);
            });

            this.setSourceFeatures(features);
        }).catch(error => {
            console.log('AppMapLayer: ' + this.layerKey + ' backend ERROR');
            console.log(error);
        });
    }

    public removeAllFeatures() {
        const hasNoFeatures = this.features.length === 0;
        if (hasNoFeatures) {
            return;
        }
    
        this.setSourceFeatures([]);
    }

    public handleMapClick(ev: mapboxgl.MapMouseEvent): boolean {
        if (!this.shouldLoadNewFeatures()) {
            return false;
        }

        const layersDataConfig = APP_CONFIG.map_app_map_layers[this.layerKey];

        let clickLayerIDs = layersDataConfig.click_layer_ids ?? [];
        if (clickLayerIDs.length === 0) {
            return false;
        }
        if (clickLayerIDs === 'SAME_AS_LAYER_IDS') {
            clickLayerIDs = layersDataConfig.layer_ids;
        }

        const nearbyFeature = MapHelpers.queryNearbyFeatureByLayerIDs(this.map, ev.lngLat, clickLayerIDs);
        if (nearbyFeature) {
            const location = OJP.Location.initWithFeature(nearbyFeature.feature);
            if (location) {
                this.showPickupPopup(location);
            }
      
            return true
        }

        return false;
    }

    private showPickupPopup(location: OJP.Location) {
        const locationLngLat = location.geoPosition?.asLngLat() ?? null;
        if (locationLngLat === null) { return }
    
        const popupHTML = this.computePopupHTML(location);
        if (popupHTML === null) {
            return;
        }
    
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

    private computePopupHTML(location: OJP.Location): string | null {
        const popupWrapperDIV = document.getElementById('map-endpoint-picker-popup') as HTMLElement;
        if (popupWrapperDIV === null) {
            return null;
        }

        let popupHTML = popupWrapperDIV.innerHTML;
        const stopPlaceName = location.stopPlace?.stopPlaceName ?? '';
        popupHTML = popupHTML.replace('[GEO_RESTRICTION_TYPE]', this.geoRestrictionType);
    
        const featureProperties = location.geoPosition?.properties ?? location.asGeoJSONFeature()?.properties ?? null
        if (featureProperties == null) {
            popupHTML = popupHTML.replace('[GEOJSON_PROPERTIES_TABLE]', 'ERROR: cant read GeoJSON properties');
            return popupHTML;
        }
        
        const tableTRs: string[] = []
        for (let key in featureProperties) {
            let value = featureProperties[key];
            if (typeof value === 'string') {
                const valueS = new String(value)
                if (valueS.startsWith('http')) {
                    value = '<a href="' + valueS + '" target="_blank">' + valueS + '</a>';
                }
            }
            
            const tableTR = '<tr><td>' + key + '</td><td>' + value + '</td></tr>';
            tableTRs.push(tableTR)
        }
    
        const tableHTML = '<table class="table">' + tableTRs.join('') + '</table>'
        popupHTML = popupHTML.replace('[GEOJSON_PROPERTIES_TABLE]', tableHTML);
    
        return popupHTML
    }

    private setSourceFeatures(features: GeoJSON.Feature[]) {
        this.features = features
    
        const source = this.map.getSource(this.mapSourceID) as mapboxgl.GeoJSONSource
        const featureCollection = <GeoJSON.FeatureCollection>{
            'type': 'FeatureCollection',
            'features': features
        }
        
        source.setData(featureCollection)
    }

    private computeFeatureFromLocation(location: OJP.Location): GeoJSON.Feature | null {
        const feature = location.asGeoJSONFeature();

        if (this.geoRestrictionType === 'stop') {
            this._patchStopFeature(feature);
        }

        if (feature?.properties) {
            feature.properties[FeaturePropsEnum.OJP_GeoRestrictionType] = this.geoRestrictionType;
            feature.properties[FeaturePropsEnum.OJP_GeoRestrictionPoiOSMTag] = this.geoRestrictionType;
        }

        return feature
    }

    private _patchStopFeature(feature: GeoJSON.Feature | null): void {
        if (feature === null || feature.properties === null) {
            return;
        }
    
        const featureStopPlaceRef = feature.properties['stopPlace.stopPlaceRef'] as string;
        let featureStopPlaceRefLabel = featureStopPlaceRef.slice();
    
        // TEST LA issue - long ids are too long - trim the Mapbox layer label if needed
        const maxCharsNo = 32;
        if (featureStopPlaceRefLabel.length > maxCharsNo) {
            featureStopPlaceRefLabel = featureStopPlaceRef.substring(0, maxCharsNo) + '...';
        }
    
        feature.properties['stopPlace.stopPlaceRefLabel'] = featureStopPlaceRefLabel;
    }
}
