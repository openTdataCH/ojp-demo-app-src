import * as GeoJSON from 'geojson'
import mapboxgl from "mapbox-gl";

import * as OJP_Next from 'ojp-sdk-next';
import OJP_Legacy from '../../config/ojp-legacy';

import { AppMapLayerOptions, DEBUG_LEVEL, MAP_APP_MAP_LAYERS, REQUESTOR_REF, OJP_VERSION } from '../../config/constants'

import { UserTripService } from "../../shared/services/user-trip.service";
import { MapHelpers } from "../helpers/map.helpers";
import { MAP_LAYERS_DEFINITIONS } from "./map-layers-def";

export enum FeaturePropsEnum {
    OJP_GeoRestrictionType = 'OJP_Legacy.GeoRestrictionType',
    OJP_GeoRestrictionPoiOSMTag = 'OJP_Legacy.GeoRestrictionPoiOSMTag',
}

export class AppMapLayer {
    private language: OJP_Legacy.Language
    private layerKey: string

    private map: mapboxgl.Map
    private restrictionType: OJP_Legacy.RestrictionType
    public restrictionPOI: OJP_Legacy.POI_Restriction | null
    public minZoom: number

    private features: GeoJSON.Feature[];
    private mapSourceID: string;
    private userTripService: UserTripService

    public isEnabled: boolean
    public lastOJPRequest: OJP_Legacy.LocationInformationRequest | null

    protected currentLocations: OJP_Legacy.Location[];

    constructor(language: OJP_Legacy.Language, layerKey: string, map: mapboxgl.Map, appMapLayerOptions: AppMapLayerOptions, userTripService: UserTripService) {
        this.language = language;
        this.layerKey = layerKey;

        this.map = map;
        this.restrictionType = appMapLayerOptions.LIR_Restriction_Type;
        
        if (appMapLayerOptions.LIR_POI_Type) {
            this.restrictionPOI = appMapLayerOptions.LIR_POI_Type
        } else {
            this.restrictionPOI = null
        }
        
        this.minZoom = appMapLayerOptions.minZoom;
        this.features = [];
        this.mapSourceID = layerKey + '-map-src';
        this.userTripService = userTripService;

        this.isEnabled = false;
        this.lastOJPRequest = null;

        this.addMapSourceAndLayers();

        this.currentLocations = [];
    }

    private addMapSourceAndLayers() {
        this.map.addSource(this.mapSourceID, <mapboxgl.GeoJSONSourceSpecification>{
            type: 'geojson',
            data: <GeoJSON.FeatureCollection>{
                'type': 'FeatureCollection',
                'features': []
            }
        });

        if (!(this.layerKey in MAP_APP_MAP_LAYERS)) {
            console.error('ERROR - AppMapLayer.addMapSourceAndLayers no layers defined for ' + this.layerKey);
            return;
        }

        const layerConfig = MAP_APP_MAP_LAYERS[this.layerKey];
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

            this.map.addLayer(layer as mapboxgl.LayerSpecification);
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

    public async refreshFeatures() {
        if (!this.shouldLoadNewFeatures()) {
            this.removeAllFeatures();
            return;
        }

        const isPOI_all = this.restrictionType === 'poi' && this.restrictionPOI?.poiType === 'poi';
        const featuresLimit = isPOI_all ? 1000 : 300;

        const mapBounds = this.map.getBounds();
        if (mapBounds === null) {
            return;
        }

        const isOJPv2 = OJP_VERSION === '2.0';
        const xmlConfig = isOJPv2 ? OJP_Next.DefaultXML_Config : OJP_Next.XML_BuilderConfigOJPv1;

        const request = OJP_Legacy.LocationInformationRequest.initWithBBOXAndType(
            this.userTripService.getStageConfig(),
            this.language,
            xmlConfig,
            REQUESTOR_REF,

            mapBounds.getWest(),
            mapBounds.getNorth(),
            mapBounds.getEast(),
            mapBounds.getSouth(),
            [this.restrictionType],
            featuresLimit,
            this.restrictionPOI,
        );
        request.enableExtensions = this.userTripService.currentAppStage !== 'OJP-SI';

        this.lastOJPRequest = request;

        const layerConfig = MAP_APP_MAP_LAYERS[this.layerKey];
        const response = await request.fetchResponse();

        if (response.message === 'ERROR') {
            console.log('AppMapLayer: ' + this.layerKey + ' backend ERROR');
            console.log(response);
            return;
        }

        const locationsDiscarded: OJP_Legacy.Location[] = [];
        const mapFeatures: Record<string, GeoJSON.Feature> = {};

        response.locations.forEach((location, idx) => {
            if (location.geoPosition === null) {
                return;
            }

            const isSharedMobility = this.restrictionType === 'poi' && this.restrictionPOI?.poiType === 'shared_mobility';
            if (isSharedMobility) {
                const layerPoiType = layerConfig.LIR_POI_Type ?? null;
                if (layerPoiType === null) {
                    locationsDiscarded.push(location);
                    return;
                }
                
                const poiCategory = location.poi?.category ?? null;
                if (poiCategory === null) {
                    locationsDiscarded.push(location);
                    return;
                }

                if (!layerPoiType.tags.includes(poiCategory)) {
                    locationsDiscarded.push(location);
                    return;
                }
            }

            const locationKey = location.geoPosition.asLatLngString();
            if (!(locationKey in mapFeatures)) {
                const feature: GeoJSON.Feature = {
                    type: 'Feature',
                    properties: {
                        locations_idx: [],
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: location.geoPosition.asPosition(),
                    }
                }

                mapFeatures[locationKey] = feature;
            }

            const feature = mapFeatures[locationKey] ?? null;
            if (feature === null || feature.properties === null) {
                return;
            }

            const locationsIdx: number[] = feature.properties['locations_idx'];
            locationsIdx.push(idx);
        });

        if (DEBUG_LEVEL === 'DEBUG') {
            if (locationsDiscarded.length > 0) {
                console.log('AppMapLayer.refreshFeatures -- discarded locations');
                console.log(locationsDiscarded);
                console.log('layer config');
                console.log(layerConfig);
            }
        }

        this.currentLocations = response.locations;
        
        const features = Object.values(mapFeatures);
        features.forEach(feature => {
            if (feature.properties === null) {
                return;
            }

            const locations_idx = feature.properties['locations_idx'] as number[];
            const featureLocations: OJP_Legacy.Location[] = []
            locations_idx.forEach(idx => {
                const location = response.locations[idx] ?? null;
                if (location) {
                    featureLocations.push(location);
                }
            })

            feature.properties['locations_idx'] = locations_idx.join(',');

            this.annotateFeatureFromLocations(feature, featureLocations);
        });

        this.setSourceFeatures(features);
    }

    public removeAllFeatures() {
        const hasNoFeatures = this.features.length === 0;
        if (hasNoFeatures) {
            return;
        }
    
        this.setSourceFeatures([]);
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

    protected annotateFeatureFromLocations(feature: GeoJSON.Feature, locations: OJP_Legacy.Location[]) {
        // extend / override
    }

    public handleMapClick(ev: mapboxgl.MapMouseEvent): boolean {
        if (!this.shouldLoadNewFeatures()) {
            return false;
        }

        const layersDataConfig = MAP_APP_MAP_LAYERS[this.layerKey];

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
        const nearbyFeature = nearbyFeatures[0];
        if (nearbyFeature.feature.properties === null) {
            return false;
        }

        let locationsIdxS: string = nearbyFeature.feature.properties['locations_idx'] ?? '';
        locationsIdxS = locationsIdxS.trim();
        if (locationsIdxS === '') {
            return false;
        }

        // Use a map because the mapbox nearbyFeatures might be duplicated
        const mapLocations: Record<number, OJP_Legacy.Location> = [];
        
        const locationsIdx = locationsIdxS.split(',');
        locationsIdx.forEach(idxS => {
            const idx = parseInt(idxS, 10);
            const location = this.currentLocations[idx] ?? null;
            if (location && !(idx in mapLocations)) {
                mapLocations[idx] = location;
            }
        });

        const locations = Object.values(mapLocations);
        if (locations.length === 0) {
            return false;
        }

        this.showPopup(locations);
        return true;
    }

    private showPopup(locations: OJP_Legacy.Location[]) {
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
            const endpointType = btnEl.getAttribute('data-endpoint-type') as OJP_Legacy.JourneyPointType;
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

    protected computePopupHTML(locations: OJP_Legacy.Location[]): string | null {
        if (locations.length === 0) {
            return null;
        }

        const firstLocation = locations[0];

        const popupWrapperDIV = document.getElementById('map-endpoint-picker-popup') as HTMLElement;
        if (popupWrapperDIV === null) {
            return null;
        }

        let popupHTML = popupWrapperDIV.innerHTML;
        popupHTML = popupHTML.replace('[GEO_RESTRICTION_TYPE]', this.restrictionType);
    
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
}
