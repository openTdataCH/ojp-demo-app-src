import mapboxgl from "mapbox-gl";

import * as OJP from 'ojp-sdk'

import { AppMapLayerOptions, APP_CONFIG } from '../../config/app-config'
import { UserTripService } from "../../shared/services/user-trip.service";
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
    public geoRestrictionPoiOSMTags: OJP.GeoRestrictionPoiOSMTag[] | null
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

        const layerConfig = APP_CONFIG.map_app_map_layers[this.layerKey];
        const layerIDs = layerConfig.layer_ids ?? [this.layerKey];
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

        const featuresLimit = this.geoRestrictionType === 'poi_all' ? 1000 : 300;

        const mapBounds = this.map.getBounds();
        const request = OJP.LocationInformationRequest.initWithBBOXAndType(
            this.userTripService.getStageConfig(),
            mapBounds.getWest(),
            mapBounds.getNorth(),
            mapBounds.getEast(),
            mapBounds.getSouth(),
            this.geoRestrictionType,
            featuresLimit,
            this.geoRestrictionPoiOSMTags,
        );

        this.lastOJPRequest = request

        const layerConfig = APP_CONFIG.map_app_map_layers[this.layerKey];

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

                if (location.poi && feature.properties && layerConfig.LIR_Restriction_Type === 'poi_all') {
                    // 50px image in ./src/assets/map-style-icons
                    feature.properties['style.icon-image'] = location.poi.computePoiMapIcon();
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

    protected annotateFeatureFromLocations(feature: GeoJSON.Feature, locations: OJP.Location[]) {
        // extend / override
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
            clickLayerIDs = layersDataConfig.layer_ids ?? [this.layerKey];
        }

        const nearbyFeatures = MapHelpers.queryNearbyFeaturesByLayerIDs(this.map, ev.lngLat, clickLayerIDs);
        if (nearbyFeatures.length === 0) {
            return false;
        }

        const locations: OJP.Location[] = [];
        nearbyFeatures.forEach(nearbyFeature => {
            const location = OJP.Location.initWithFeature(nearbyFeature.feature);
            if (location) {
                locations.push(location);
            }
        });

        if (locations.length === 0) {
            return false;
        }

        this.showPopup(locations);
        return true;
    }

    private showPopup(locations: OJP.Location[]) {
        if (locations.length === 0) {
            return;
        }

        const location = locations[0];
        const locationLngLat = location.geoPosition?.asLngLat() ?? null;
        if (locationLngLat === null) { return }
    
        const popupHTML = this.computePopupHTML(locations);
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

    protected computePopupHTML(locations: OJP.Location[]): string | null {
        if (locations.length === 0) {
            return null;
        }

        const firstLocation = locations[0];

        if (this.geoRestrictionType === 'poi_all') {
            const poiPopupHTML = this.computePOIPopupHTML(firstLocation);
            if (poiPopupHTML) {
                return poiPopupHTML;
            }
        }

        const chargingStationType: OJP.GeoRestrictionPoiOSMTag = 'charging_station';
        const isChargingStation = ((this.geoRestrictionType === 'poi_amenity') && this.geoRestrictionPoiOSMTags?.indexOf(chargingStationType) !== -1);
        if (isChargingStation) {
            const chargingStationHTML = this.computeChargingStationPopupHTML(locations);
            if (chargingStationHTML) {
                return chargingStationHTML;
            }
        }

        const popupWrapperDIV = document.getElementById('map-endpoint-picker-popup') as HTMLElement;
        if (popupWrapperDIV === null) {
            return null;
        }

        let popupHTML = popupWrapperDIV.innerHTML;
        popupHTML = popupHTML.replace('[GEO_RESTRICTION_TYPE]', this.geoRestrictionType);
    
        const featureProperties = firstLocation.geoPosition?.properties ?? firstLocation.asGeoJSONFeature()?.properties ?? null
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

    private computePOIPopupHTML(location: OJP.Location): string | null {
        const popupWrapperDIV = document.getElementById('map-poi-picker-popup') as HTMLElement;
        if (popupWrapperDIV === null) {
            return null;
        }

        const geoJsonProperties = location.geoPosition?.properties ?? null;
        if (geoJsonProperties === null) {
            return null;
        }

        let popupHTML = popupWrapperDIV.innerHTML;
        popupHTML = popupHTML.replace('[POI_NAME]', geoJsonProperties['poi.name']);

        const tableTRs: string[] = []
        tableTRs.push('<tr><td>Code</td><td>' + geoJsonProperties['poi.code'].substring(0, 20) + '...</td></tr>');
        tableTRs.push('<tr><td>Category</td><td>' + geoJsonProperties['poi.category'] + '</td></tr>');
        tableTRs.push('<tr><td>SubCategory</td><td>' + geoJsonProperties['poi.subcategory'] + '</td></tr>');

        const tableHTML = '<table class="table">' + tableTRs.join('') + '</table>';
        popupHTML = popupHTML.replace('[GEOJSON_PROPERTIES_TABLE]', tableHTML);

        return popupHTML;
    }

    // TODO - use a child class - ChargingStationAppMapLayer
    private computeChargingStationPopupHTML(locations: OJP.Location[]): string | null {
        const popupWrapperDIV = document.getElementById('map-poi-picker-popup') as HTMLElement;
        if (popupWrapperDIV === null) {
            return null;
        }

        if (locations.length === 0) {
            return null;
        }

        const firstLocation = locations[0];
        const firstLocationProperties = firstLocation.geoPosition?.properties ?? null;
        if (firstLocationProperties === null) {
            return null;
        }

        // it could be that we get different POI category
        if (firstLocationProperties['poi.category'] !== 'charging_station') {
            return null;
        }

        const tableTRs: string[] = [];
        tableTRs.push('<tr><td style="width:50px;">Name</td><td>' + firstLocationProperties['poi.name'] + ' - ' + firstLocationProperties['locationName'] + '</td></tr>');
        
        let codeCleaned = firstLocationProperties['poi.code'];
        codeCleaned = codeCleaned.replace(firstLocationProperties['poi.name'], '');
        codeCleaned = codeCleaned.replace(firstLocationProperties['locationName'], '');
        tableTRs.push('<tr><td>Code</td><td>' + codeCleaned + '</td></tr>');

        const statusLIs: string[] = [];
        locations.forEach((location, idx) => {
            const featureProperties = location.geoPosition?.properties ?? null;
            if (featureProperties === null) {
                return;
            }

            const locationStatus = (() => {
                const featureLocationStatus = featureProperties['OJP.Attr.locationStatus'].toUpperCase();
                let className = 'bg-success';
                let locationStatusText = featureLocationStatus.toLowerCase();
                if (featureLocationStatus === 'AVAILABALE') {
                    locationStatusText = 'available';
                }
                if (featureLocationStatus === 'OCCUPIED') {
                    className = 'bg-danger';
                }
                if (featureLocationStatus === 'UNKNOWN') {
                    className = 'bg-secondary';
                }

                return '<span class="badge rounded-pill ' + className + '">' + locationStatusText + '</span>';
            })();
            const statusLI = '<li>' + locationStatus + ' ' + featureProperties['OJP.Attr.Code'] + '</li>';
            statusLIs.push(statusLI);
        });

        tableTRs.push('<tr><td colspan="2"><p>Chargers (' + locations.length + ')</p><ul>' + statusLIs.join('') + '</ul></td></tr>');

        let popupHTML = popupWrapperDIV.innerHTML;
        popupHTML = popupHTML.replace('[POI_NAME]', 'Charging Station');

        const tableHTML = '<table class="table popup-charging-station">' + tableTRs.join('') + '</table>';
        popupHTML = popupHTML.replace('[GEOJSON_PROPERTIES_TABLE]', tableHTML);

        return popupHTML;
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
            feature.properties[FeaturePropsEnum.OJP_GeoRestrictionPoiOSMTag] = this.geoRestrictionPoiOSMTags?.join(',');
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
