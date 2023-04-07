import * as GeoJSON from 'geojson'
import mapboxgl from "mapbox-gl";

import * as OJP from 'ojp-sdk'

import serviceTrackLineLayerJSON from './map-layers-def/service-track-line.json'
import serviceTrackStopLayerJSON from './map-layers-def/service-track-stop.json'

type LinePointType = 'prev' | 'next'

export class StopEventServiceRenderer {
    private map: mapboxgl.Map
    private sourceID: string

    constructor(map: mapboxgl.Map) {
        this.map = map
        this.sourceID = 'stop-event-service-data';
        
        this.addMapLayers(map);
    }

    private addMapLayers(map: mapboxgl.Map) {
        const source: mapboxgl.GeoJSONSourceRaw = {
            type: 'geojson',
            data: <GeoJSON.FeatureCollection> {
                type: 'FeatureCollection',
                features: []
            }
        };
        map.addSource(this.sourceID, source);

        const serviceTrackLineLayer = serviceTrackLineLayerJSON as mapboxgl.LineLayer;
        serviceTrackLineLayer.source = this.sourceID;
        map.addLayer(serviceTrackLineLayer);

        const serviceTrackStopLayer = serviceTrackStopLayerJSON as mapboxgl.CircleLayer;
        serviceTrackStopLayer.source = this.sourceID;
        map.addLayer(serviceTrackStopLayer);
    }

    public drawStopEvent(stopEvent: OJP.StopEvent) {
        let geojsonFeatures: GeoJSON.Feature[] = [];

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
            let stopPointsRef = is_previous ? stopEvent.prevStopPoints : stopEvent.nextStopPoints;

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
        const geoPosition = stopEvent.stopPoint.location.geoPosition;
        if (geoPosition) {
            lineFeaturePoints.prev.push(geoPosition.asPosition());
            lineFeaturePoints.next.unshift(geoPosition.asPosition());
            
            const feature = stopEvent.stopPoint.location.asGeoJSONFeature();
            if (feature && feature.properties) {
                feature.properties['point-type'] = 'next';
                feature.properties['point-size'] = 'large';
                pointFeatures['next'].push(feature);
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
            geojsonFeatures.push(lineFeature);

            geojsonFeatures = geojsonFeatures.concat(pointFeatures[linePointType]);
        })

        const geojson = <GeoJSON.FeatureCollection>{
            type: 'FeatureCollection',
            features: geojsonFeatures
        }

        this.udateStopEventSource(geojson);
    }

    public resetStopEventLayers() {
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