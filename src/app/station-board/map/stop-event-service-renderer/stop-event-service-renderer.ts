import * as GeoJSON from 'geojson'
import mapboxgl from "mapbox-gl";

import OJP_Legacy from '../../../config/ojp-legacy';

import serviceTrackLineLayerJSON from './map-layers-def/service-track-line.json'
import serviceTrackStopLayerJSON from './map-layers-def/service-track-stop.json'

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
        this.drawStopPoints(stopEvent.prevStopPoints, stopEvent.nextStopPoints, stopEvent.stopPoint);
    }

    public drawServiceStopPoints(stopPoints: OJP_Legacy.StopPoint[]) {
        this.drawStopPoints([], stopPoints, stopPoints[0]);
    }
    
    private drawStopPoints(prevStopPoints: OJP_Legacy.StopPoint[], nextStopPoints: OJP_Legacy.StopPoint[], currentStopPoint: OJP_Legacy.StopPoint | null) {
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
            let stopPointsRef = is_previous ? prevStopPoints : nextStopPoints;

            stopPointsRef.forEach((stopPoint, idx) => {
                const geoPosition = stopPoint.location.geoPosition;
                if (geoPosition === null) {
                    return;
                }

                lineFeaturePoints[linePointType].push(geoPosition.asPosition())

                const isFirst = idx === 0;
                const isLast = idx === stopPointsRef.length - 1;

                const feature = stopPoint.location.asGeoJSONFeature();
                if (feature && feature.properties) {
                    feature.properties['point-type'] = linePointType;
                    
                    if (is_previous) {
                        feature.properties['point-size'] = isFirst ? 'large' : 'normal';
                    } else {
                        feature.properties['point-size'] = isLast ? 'large' : 'normal';
                    }

                    pointFeatures[linePointType].push(feature);
                }
            })
        });

        // Insert current station
        if (currentStopPoint) {
            const geoPosition = currentStopPoint.location.geoPosition;
            if (geoPosition) {
                lineFeaturePoints.prev.push(geoPosition.asPosition());
                lineFeaturePoints.next.unshift(geoPosition.asPosition());
                
                const feature = currentStopPoint.location.asGeoJSONFeature();
                if (feature && feature.properties) {
                    feature.properties['point-type'] = 'next';
                    feature.properties['point-size'] = 'large';
                    pointFeatures['next'].push(feature);
                }
            }
        }

        linePointTypes.forEach(linePointType => {
            const points = lineFeaturePoints[linePointType];
            if (points.length < 2) {
                return;
            }

            const lineFeature = <GeoJSON.Feature>{
                type: 'Feature',
                properties: {
                    'line-type':linePointType,
                },
                geometry: <GeoJSON.LineString>{
                    type: 'LineString',
                    coordinates: points
                }
            }
            this.geojsonFeatures.push(lineFeature);

            this.geojsonFeatures = this.geojsonFeatures.concat(pointFeatures[linePointType]);
        })

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