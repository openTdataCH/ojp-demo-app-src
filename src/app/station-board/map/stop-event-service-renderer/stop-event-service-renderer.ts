import * as GeoJSON from 'geojson'
import mapboxgl from "mapbox-gl";

import OJP_Legacy from '../../../config/ojp-legacy';
import * as OJP_Next from 'ojp-sdk-next';

import serviceTrackLineLayerJSON from './map-layers-def/service-track-line.json'
import serviceTrackStopLayerJSON from './map-layers-def/service-track-stop.json'
import { TripInfoResult } from '../../../shared/models/trip-info-result';

type LinePointType = 'prev' | 'next'

export class StopEventServiceRenderer {
    private map: mapboxgl.Map
    private sourceID: string;
    public geojsonFeatures: GeoJSON.Feature[]

    constructor(map: mapboxgl.Map) {
        this.map = map
        this.sourceID = 'stop-event-service-data';
        this.geojsonFeatures = [];
        
        this.addMapLayers(map);
    }

    private addMapLayers(map: mapboxgl.Map) {
        const source: mapboxgl.GeoJSONSourceSpecification = {
            type: 'geojson',
            data: <GeoJSON.FeatureCollection> {
                type: 'FeatureCollection',
                features: []
            }
        };
        map.addSource(this.sourceID, source);

        const serviceTrackLineLayer = serviceTrackLineLayerJSON as mapboxgl.LineLayerSpecification;
        serviceTrackLineLayer.source = this.sourceID;
        map.addLayer(serviceTrackLineLayer);

        const serviceTrackStopLayer = serviceTrackStopLayerJSON as mapboxgl.CircleLayerSpecification;
        serviceTrackStopLayer.source = this.sourceID;
        map.addLayer(serviceTrackStopLayer);
    }

    public drawStopEvent(stopEvent: OJP_Legacy.StopEvent) {
        const convertStopPointsToGeoPosition = (stopPoints: OJP_Legacy.StopPoint[]) => {
            const geoPositions: OJP_Next.GeoPosition[] = [];
            
            stopPoints.forEach(el => {
                const geoPosition = el.location.geoPosition ?? null;
                if (geoPosition) {
                    geoPositions.push(new OJP_Next.GeoPosition(geoPosition.longitude, geoPosition.latitude));
                }
            });

            return geoPositions;
        };

        const prevStopPositions = convertStopPointsToGeoPosition(stopEvent.prevStopPoints);
        const nextStopPositions = convertStopPointsToGeoPosition(stopEvent.nextStopPoints);
        const currentStopPositions = convertStopPointsToGeoPosition([stopEvent.stopPoint]);

        this.drawStopPositions(prevStopPositions, nextStopPositions, currentStopPositions[0] ?? null);
    }

    public drawTripInfoResult(tripResult: TripInfoResult) {
        const nextStopPositions = (() => {
            const geoPositions: OJP_Next.GeoPosition[] = [];
            tripResult.calls.forEach(el => {
                if (el.place) {
                    geoPositions.push(el.place.geoPosition);
                }
            });

            return geoPositions;
        })();

        this.drawStopPositions([], nextStopPositions, null);
    }
    
    private drawStopPositions(prevStopPositions: OJP_Next.GeoPosition[], nextStopPositions: OJP_Next.GeoPosition[], currentGeoPosition: OJP_Next.GeoPosition | null) {
        this.geojsonFeatures = [];

        const lineFeaturePoints: Record<LinePointType, GeoJSON.Position[]> = {
            prev: [],
            next: [],
        };
        const pointFeatures: Record<LinePointType, GeoJSON.Feature[]> = {
            prev: [],
            next: [],
        };

        const linePointTypes: LinePointType[] = ['prev', 'next'];
        linePointTypes.forEach(linePointType => {
            const is_previous = linePointType === 'prev';
            const stopPositions = is_previous ? prevStopPositions : nextStopPositions;

            stopPositions.forEach((stopPosition, idx) => {
                const stopCoordinates = stopPosition.asLngLat();
                
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

            const lineFeature = <GeoJSON.Feature>{
                type: 'Feature',
                properties: {
                    'line-type': segmentType,
                },
                geometry: <GeoJSON.LineString>{
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
        const source = this.map.getSource(this.sourceID) as mapboxgl.GeoJSONSource;
        if (source === null) {
            console.error('ERROR - cant find the source ' + this.sourceID);
            console.log(this.map.getStyle());
            return;
        }

        source.setData(geojson);
    }
}