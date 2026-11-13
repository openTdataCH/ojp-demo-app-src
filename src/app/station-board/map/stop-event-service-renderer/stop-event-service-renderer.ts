import * as GeoJSON from 'geojson'
import mapgl from "maplibre-gl";

import * as OJP from 'ojp-sdk';

import serviceTrackLineLayerJSON from './map-layers-def/service-track-line.json'
import serviceTrackStopLayerJSON from './map-layers-def/service-track-stop.json'
import { TripInfoResult } from '../../../shared/models/trip-info-result';
import { StopEventResult } from '../../../shared/models/stop-event-result';
import { StopPointCall } from '../../../shared/models/stop-point-call';

type LinePointType = 'prev' | 'next';

export class StopEventServiceRenderer {
    private map: mapgl.Map
    private sourceID: string;
    private layerIDs: string[];
    public geojsonFeatures: GeoJSON.Feature[]

    constructor(map: mapgl.Map, sourceID = 'stop-event-service-data', routeColor: string | null = null) {
        this.map = map
        this.sourceID = sourceID;
        this.layerIDs = [];
        this.geojsonFeatures = [];
        
        this.addMapLayers(map, routeColor);
    }

    private addMapLayers(map: mapgl.Map, routeColor: string | null) {
        const source: mapgl.GeoJSONSourceSpecification = {
            type: 'geojson',
            data: <GeoJSON.FeatureCollection> {
                type: 'FeatureCollection',
                features: []
            }
        };
        map.addSource(this.sourceID, source);

        const serviceTrackLineLayer = Object.assign({}, serviceTrackLineLayerJSON) as mapgl.LineLayerSpecification;
        serviceTrackLineLayer.paint = Object.assign({}, serviceTrackLineLayerJSON.paint) as mapgl.LineLayerSpecification['paint'];
        serviceTrackLineLayer.source = this.sourceID;
        if (this.sourceID !== 'stop-event-service-data') {
            serviceTrackLineLayer.id = this.sourceID + '-line';
        }
        if (routeColor !== null && serviceTrackLineLayer.paint) {
            serviceTrackLineLayer.paint['line-color'] = routeColor;
        }
        map.addLayer(serviceTrackLineLayer);
        this.layerIDs.push(serviceTrackLineLayer.id);

        const serviceTrackStopLayer = Object.assign({}, serviceTrackStopLayerJSON) as mapgl.CircleLayerSpecification;
        serviceTrackStopLayer.paint = Object.assign({}, serviceTrackStopLayerJSON.paint) as mapgl.CircleLayerSpecification['paint'];
        serviceTrackStopLayer.source = this.sourceID;
        if (this.sourceID !== 'stop-event-service-data') {
            serviceTrackStopLayer.id = this.sourceID + '-stop';
        }
        if (routeColor !== null && serviceTrackStopLayer.paint) {
            serviceTrackStopLayer.paint['circle-color'] = routeColor;
        }
        map.addLayer(serviceTrackStopLayer);
        this.layerIDs.push(serviceTrackStopLayer.id);
    }

    public setVisible(visible: boolean) {
        let visibility: 'visible' | 'none' = 'none';
        if (visible) {
            visibility = 'visible';
        }

        this.layerIDs.forEach(layerID => {
            this.map.setLayoutProperty(layerID, 'visibility', visibility);
        });
    }

    public drawStopEvent(stopEvent: StopEventResult) {
        const convertStopPointsToGeoPosition = (stopPoints: StopPointCall[]) => {
            const geoPositions: OJP.GeoPosition[] = [];
            
            stopPoints.forEach(el => {
                const geoPosition = el.place?.geoPosition ?? null;
                if (geoPosition) {
                    geoPositions.push(new OJP.GeoPosition(geoPosition.longitude, geoPosition.latitude));
                }
            });

            return geoPositions;
        };

        const prevStopPositions = convertStopPointsToGeoPosition(stopEvent.prevCalls);
        const nextStopPositions = convertStopPointsToGeoPosition(stopEvent.nextCalls);
        const currentStopPositions = convertStopPointsToGeoPosition([stopEvent.thisCall]);

        this.drawStopPositions(prevStopPositions, nextStopPositions, currentStopPositions[0] ?? null, []);
    }

    public drawTripInfoResult(tripResult: TripInfoResult) {
        const nextStopPositions = (() => {
            const geoPositions: OJP.GeoPosition[] = [];
            tripResult.calls.forEach(el => {
                if (el.place) {
                    geoPositions.push(el.place.geoPosition);
                }
            });

            return geoPositions;
        })();

        const detailedRouteCoords: OJP.GeoPosition[] = (() => {
            if (tripResult.trackSectionsGeoPositions.length === 0) {
                return [];
            }

            if (tripResult.trackSectionsGeoPositions.length > 1) {
                console.error('WARNING - MultLineString not yet implemented, using first');
            }

            return tripResult.trackSectionsGeoPositions[0];
        })();

        this.drawStopPositions([], nextStopPositions, null, detailedRouteCoords);
    }
    
    private drawStopPositions(prevStopPositions: OJP.GeoPosition[], nextStopPositions: OJP.GeoPosition[], currentGeoPosition: OJP.GeoPosition | null, detailedRouteCoords: OJP.GeoPosition[]) {
        this.geojsonFeatures = [];
        const hasDetailedRoute = detailedRouteCoords.length > 0;

        const lineFeaturePoints: Record<LinePointType, GeoJSON.Position[]> = {
            prev: [],
            next: [],
        };
        const pointFeatures: Record<LinePointType, GeoJSON.Feature[]> = {
            prev: [],
            next: [],
        };

        if (hasDetailedRoute) {
            detailedRouteCoords.forEach(geoPosition => {
                lineFeaturePoints.next.push(geoPosition.asLngLat());
            });
        }

        const linePointTypes: LinePointType[] = ['prev', 'next'];
        linePointTypes.forEach(linePointType => {
            const is_previous = linePointType === 'prev';
            const stopPositions = is_previous ? prevStopPositions : nextStopPositions;

            stopPositions.forEach((stopPosition, idx) => {
                const stopCoordinates = stopPosition.asLngLat();
                
                if (!hasDetailedRoute) {
                    lineFeaturePoints[linePointType].push(stopCoordinates);
                }

                const isFirst = idx === 0;
                const isLast = idx === stopPositions.length - 1;

                const featureProperties: GeoJSON.GeoJsonProperties = {
                    'point-type': linePointType,
                };
                if (is_previous) {
                    featureProperties['point-size'] = isFirst ? 'large' : 'normal';
                } else {
                    featureProperties['point-size'] = isLast ? 'large' : 'normal';
                }

                const feature: GeoJSON.Feature<GeoJSON.Point> = {
                    type: 'Feature',
                    properties: featureProperties,
                    geometry: {
                        type: 'Point',
                        coordinates: stopCoordinates,
                    }
                };

                pointFeatures[linePointType].push(feature);
            });
        });

        // Insert current station
        if (currentGeoPosition) {
            const stopCoordinates = currentGeoPosition.asLngLat();
            
            if (!hasDetailedRoute) {
                lineFeaturePoints.prev.push(stopCoordinates);
                lineFeaturePoints.next.unshift(stopCoordinates);
            }

            const feature: GeoJSON.Feature<GeoJSON.Point> = {
                type: 'Feature',
                properties: {
                    'point-type': 'next',
                    'point-size': 'large',
                },
                geometry: {
                    type: 'Point',
                    coordinates: stopCoordinates,
                }
            };

            pointFeatures['next'].push(feature);
        }

        
        linePointTypes.forEach(segmentType => {
            const points = lineFeaturePoints[segmentType];
            if (points.length < 2) {
                return;
            }

            const lineFeature: GeoJSON.Feature<GeoJSON.LineString> = {
                type: 'Feature',
                properties: {
                    'line-type': segmentType,
                },
                geometry: {
                    type: 'LineString',
                    coordinates: points
                }
            }
            this.geojsonFeatures.push(lineFeature);

            this.geojsonFeatures = this.geojsonFeatures.concat(pointFeatures[segmentType]);
        });

        const geojson = <GeoJSON.FeatureCollection>{
            type: 'FeatureCollection',
            features: this.geojsonFeatures
        }

        this.udateStopEventSource(geojson);
    }

    public resetStopEventLayers() {
        this.geojsonFeatures = [];

        const emptyGeoJSON = <GeoJSON.FeatureCollection> {
            type: 'FeatureCollection',
            features: []
        };
        this.udateStopEventSource(emptyGeoJSON);
    }

    private udateStopEventSource(geojson: GeoJSON.FeatureCollection) {
        const source = this.map.getSource(this.sourceID) as mapgl.GeoJSONSource;
        if (source === null) {
            console.error('ERROR - cant find the source ' + this.sourceID);
            console.log(this.map.getStyle());
            return;
        }

        source.setData(geojson);
    }
}
