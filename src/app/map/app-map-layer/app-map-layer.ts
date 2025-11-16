import * as GeoJSON from 'geojson'
import mapboxgl from "mapbox-gl";

import * as OJP_SharedTypes from 'ojp-shared-types';

import OJP_Legacy from '../../config/ojp-legacy';

import { AppMapLayerOptions, DEBUG_LEVEL, MAP_APP_MAP_LAYERS, OJP_VERSION } from '../../config/constants'

import { UserTripService } from "../../shared/services/user-trip.service";
import { MapHelpers } from "../helpers/map.helpers";
import { MAP_LAYERS_DEFINITIONS } from "./map-layers-def";
import { AnyPlace, PlaceBuilder } from '../../shared/models/place/place-builder';
import { Poi, POI_Restriction, RestrictionPoiOSMTag } from '../../shared/models/place/poi';
import { OJPHelpers } from '../../helpers/ojp-helpers';
import { AnyLocationInformationRequest } from '../../shared/types/_all';

export enum FeaturePropsEnum {
    OJP_GeoRestrictionType = 'OJP_Legacy.GeoRestrictionType',
    OJP_GeoRestrictionPoiOSMTag = 'OJP_Legacy.GeoRestrictionPoiOSMTag',
}

export class AppMapLayer {
    private language: OJP_Legacy.Language;
    private layerKey: string;

    private map: mapboxgl.Map;
    private restrictionType: OJP_SharedTypes.PlaceTypeEnum;
    public restrictionPOI: POI_Restriction | null;
    public minZoom: number;

    private features: GeoJSON.Feature[];
    private mapSourceID: string;
    private userTripService: UserTripService;

    public isEnabled: boolean;
    public lastOJPRequest: AnyLocationInformationRequest | null;

    protected mapCurrentPlaces: Record<string, AnyPlace>;

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

        this.mapCurrentPlaces = {};
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

        const isOJPv2 = OJP_VERSION === '2.0';

        const isPOI_all = this.restrictionType === 'poi' && this.restrictionPOI?.poiType === 'poi';
        const featuresLimit = isPOI_all ? 1000 : 300;

        const mapBounds = this.map.getBounds();
        if (mapBounds === null) {
            return;
        }
        const bboxData = [mapBounds.getWest(), mapBounds.getSouth(), mapBounds.getEast(), mapBounds.getNorth()];

        const restrictionTypes: OJP_SharedTypes.PlaceTypeEnum[] = (() => {
            if (isOJPv2) {
                if (this.restrictionType === 'stop') {
                    return ['stop'];
                } else {
                    // in OJP2 - POI queries are done with <PersonalMode>, see below
                    return [];
                }
            } else {
                return [this.restrictionType];
            }
        })();

        const ojpSDK_Next = this.userTripService.createOJP_SDK_Instance(this.language);
        const request = ojpSDK_Next.requests.LocationInformationRequest.initWithBBOX(bboxData, restrictionTypes, featuresLimit);
        if (isOJPv2) {
            // in OJP2 - POI queries are done with <PersonalMode>
            if (this.restrictionType === 'poi') {
                if (request.payload.restrictions) {
                    const personalMode: OJP_SharedTypes.PersonalModesEnum | null = (() => {
                        const poiRestrictionTags = this.restrictionPOI?.tags ?? [];

                        if (poiRestrictionTags.includes('car_sharing')) {
                            return 'car';
                        }
                        if (poiRestrictionTags.includes('bicycle_rental')) {
                            return 'bicycle';
                        }
                        if (poiRestrictionTags.includes('escooter_rental')) {
                            return 'scooter';
                        }

                        return null;
                    })();

                    if (personalMode !== null) {
                        request.payload.restrictions.modes = {
                            ptMode: [],
                            personalMode: [personalMode],
                        };
                    }
                }
            }
        }

        
        const response = await request.fetchResponse(ojpSDK_Next);

        this.lastOJPRequest = request;

        const layerConfig = MAP_APP_MAP_LAYERS[this.layerKey];

        if (!response.ok) {
            console.log('ERROR - failed to bbox lookup locations for "' + bboxData.join(', ') + '"');
            console.log(response);
            return;
        }

        this.mapCurrentPlaces = {};
        const placesDiscarded: AnyPlace[] = [];
        const mapFeatures: Record<string, GeoJSON.Feature> = {};

        const placeResults = OJPHelpers.parseAnyPlaceResult(OJP_VERSION, response);

        placeResults.forEach((placeResult, idx) => {
            const place = PlaceBuilder.initWithPlaceResultSchema(OJP_VERSION, placeResult);
            if (place === null) {
                return;
            }

            const isSharedMobility = this.restrictionType === 'poi' && this.restrictionPOI?.poiType === 'shared_mobility';
            if (isSharedMobility) {
                const layerPoiType = layerConfig.LIR_POI_Type ?? null;
                if (layerPoiType === null) {
                    placesDiscarded.push(place);
                    return;
                }

                if (place.type === 'poi') {
                    const poi = place as Poi;
                    if (poi.categories.length === 0) {
                        const poiCategory = poi.categories[0] as RestrictionPoiOSMTag;
                        if (!layerPoiType.tags.includes(poiCategory)) {
                            placesDiscarded.push(place);
                            return;
                        }
                    }
                }
            }

            const locationKey = place.geoPosition.asLatLngString();
            if (!(locationKey in mapFeatures)) {
                const feature: GeoJSON.Feature = {
                    type: 'Feature',
                    properties: {
                        // TODO - rename locations_idx to places_idx
                        locations_idx: [],
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: place.geoPosition.asLngLat(),
                    }
                };

                mapFeatures[locationKey] = feature;
            }

            const feature = mapFeatures[locationKey] ?? null;
            if (feature === null || feature.properties === null) {
                return;
            }

            const locationsIdx: number[] = feature.properties['locations_idx'];
            locationsIdx.push(idx);

            this.mapCurrentPlaces[idx] = place;
        });

        if (DEBUG_LEVEL === 'DEBUG') {
            if (placesDiscarded.length > 0) {
                console.log('AppMapLayer.refreshFeatures -- discarded locations');
                console.log(placesDiscarded);
                console.log('layer config');
                console.log(layerConfig);
            }
        }

        const features = Object.values(mapFeatures);
        features.forEach(feature => {
            if (feature.properties === null) {
                return;
            }

            const locations_idx = feature.properties['locations_idx'] as number[];
            const featurePlaces: AnyPlace[] = [];
            locations_idx.forEach(idx => {
                const place = this.mapCurrentPlaces[idx] ?? null;
                if (place) {
                    featurePlaces.push(place);
                }
            })

            feature.properties['locations_idx'] = locations_idx.join(',');

            this.annotateFeatureFromLocations(feature, featurePlaces);
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
        this.features = features;
    
        const source = this.map.getSource(this.mapSourceID) as mapboxgl.GeoJSONSource;
        const featureCollection: GeoJSON.FeatureCollection = {
            'type': 'FeatureCollection',
            'features': features
        };
        
        source.setData(featureCollection);
    }

    protected annotateFeatureFromLocations(feature: GeoJSON.Feature, places: AnyPlace[]) {
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
        const mapPlaces: Record<number, AnyPlace> = [];
        
        const locationsIdx = locationsIdxS.split(',');
        locationsIdx.forEach(idxS => {
            const idx = parseInt(idxS, 10);
            const location = this.mapCurrentPlaces[idx] ?? null;
            if (location && !(idx in mapPlaces)) {
                mapPlaces[idx] = location;
            }
        });

        const locations = Object.values(mapPlaces);
        if (locations.length === 0) {
            return false;
        }

        this.showPopup(locations);
        return true;
    }

    private showPopup(places: AnyPlace[]) {
        const place = places[0];
        const locationLngLat = place.geoPosition.asLngLat();
    
        const popupHTML = this.computePopupHTML(places);
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

            this.userTripService.updateTripEndpoint(place, endpointType, 'MapPopupClick');
    
            popup.remove();
        });
    
        popup.setLngLat(locationLngLat)
            .setDOMContent(popupContainer)
            .addTo(this.map);
    }

    protected computePopupHTML(places: AnyPlace[]): string | null {
        if (places.length === 0) {
            return null;
        }

        const firstPlace = places[0];

        const popupWrapperDIV = document.getElementById('map-endpoint-picker-popup') as HTMLElement;
        if (popupWrapperDIV === null) {
            return null;
        }

        let popupHTML = popupWrapperDIV.innerHTML;
        popupHTML = popupHTML.replace('[GEO_RESTRICTION_TYPE]', this.restrictionType);
    
        const featureProperties = firstPlace.computeGeoJSON_Properties();
        
        const tableTRs: string[] = [];
        for (let key in featureProperties) {
            let value = featureProperties[key];
            if (typeof value === 'string') {
                const valueS = new String(value)
                if (valueS.startsWith('http')) {
                    value = '<a href="' + valueS + '" target="_blank">' + valueS + '</a>';
                }
            }
            
            const tableTR = '<tr><td>' + key + '</td><td>' + value + '</td></tr>';
            tableTRs.push(tableTR);
        }
    
        const tableHTML = '<table class="table">' + tableTRs.join('') + '</table>';
        popupHTML = popupHTML.replace('[GEOJSON_PROPERTIES_TABLE]', tableHTML);
    
        return popupHTML;
    }
}
