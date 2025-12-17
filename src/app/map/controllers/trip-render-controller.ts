import * as GeoJSON from 'geojson';

import tripLegBeelineLayerJSON from './map-layers-def/ojp-trip-leg-beeline.json';

import tripTimedLegEndpointFromCircleLayerJSON from './map-layers-def/ojp-trip-timed-leg-endpoint-from-circle.json';
import tripTimedLegEndpointIntermediateCircleLayerJSON from './map-layers-def/ojp-trip-timed-leg-endpoint-intermediate-circle.json';
import tripTimedLegEndpointToCircleLayerJSON from './map-layers-def/ojp-trip-timed-leg-endpoint-to-circle.json';

import tripLegLineLayerJSON from './map-layers-def/ojp-trip-timed-leg-track.json';
import tripLegLineLayerP2JSON from './map-layers-def/ojp-trip-timed-leg-track-p2.json';
import tripLegLineLayerP2OuterJSON from './map-layers-def/ojp-trip-timed-leg-track-p2-outer.json';

import tripLegWalkingLineLayerJSON from './map-layers-def/ojp-trip-walking-leg-line.json';
import tripLegWalkingLineLayerP2JSON from './map-layers-def/ojp-trip-walking-leg-line-p2.json';
import tripLegWalkingLineLayerP2OuterJSON from './map-layers-def/ojp-trip-walking-leg-line-p2-outer.json';

import { TripLegGeoController } from '../../shared/controllers/trip-geo-controller';

import { TripLegData } from '../../shared/types/trip';
import { TripLegDrawType, TripLegPropertiesEnum } from '../../shared/types/map-geometry-types';

export class TripRenderController {
  private map: mapboxgl.Map;
  private mapSourceId = 'trip-data';

  constructor(map: mapboxgl.Map) {
    this.map = map;
    this.addMapSourceAndLayers();
  }

  public renderTrip(mapTripLegs: TripLegData[]) {
    const geojson = this.computeGeoJSON(mapTripLegs);

    this.setSourceFeatures(geojson.features, this.mapSourceId);
  }

  private addMapSourceAndLayers() {
    const source: mapboxgl.GeoJSONSourceSpecification = {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    };

    this.map.addSource(this.mapSourceId, source);

    const mapLayers = this.computeMapLayers();


    mapLayers.forEach(mapLayerJSON => {
      const mapLayerDef = mapLayerJSON as mapboxgl.Layer;
      mapLayerDef.source = this.mapSourceId;
      this.map.addLayer(mapLayerDef as mapboxgl.LayerSpecification);
    });
  }

  private computeMapLayers(): mapboxgl.LayerSpecification[] {
    const tripLegBeelineLayer = tripLegBeelineLayerJSON as mapboxgl.LineLayerSpecification;
    
    const tripTimedLegEndpointFromCircleLayer = tripTimedLegEndpointFromCircleLayerJSON as mapboxgl.CircleLayerSpecification;
    const tripTimedLegEndpointIntermediateCircleLayer = tripTimedLegEndpointIntermediateCircleLayerJSON as mapboxgl.CircleLayerSpecification;
    const tripTimedLegEndpointToCircleLayer = tripTimedLegEndpointToCircleLayerJSON as mapboxgl.CircleLayerSpecification;
    
    const tripLegLineLayer = tripLegLineLayerJSON as mapboxgl.LineLayerSpecification;
    const tripLegLineP2Layer = tripLegLineLayerP2JSON as mapboxgl.LineLayerSpecification;
    const tripLegLineP2OuterLayer = tripLegLineLayerP2OuterJSON as mapboxgl.LineLayerSpecification;
    
    const tripLegWalkingLineLayer = tripLegWalkingLineLayerJSON as mapboxgl.LineLayerSpecification;
    const tripLegWalkingLineP2Layer = tripLegWalkingLineLayerP2JSON as mapboxgl.LineLayerSpecification;
    const tripLegWalkingLineP2OuterLayer = tripLegWalkingLineLayerP2OuterJSON as mapboxgl.LineLayerSpecification;

    const mapLayers = [                             // layers order matters:
      tripLegBeelineLayer,                          //    - line (beelines)
      
      tripLegWalkingLineP2OuterLayer,               //    - line (provider 2 - casing)
      tripLegWalkingLineP2Layer,                    //    - line (provider 2)
      tripLegWalkingLineLayer,                      //    - line

      tripLegLineP2OuterLayer,                      //    - line provider 2 + casing
      tripLegLineP2Layer,                           //    -  + casing
      
      tripLegLineLayer,                             //    - line
      
      tripTimedLegEndpointIntermediateCircleLayer,  //    - circle (endpoints, intermediary points)
      tripTimedLegEndpointToCircleLayer,            //    - circle (endpoints, intermediary points)
      tripTimedLegEndpointFromCircleLayer,          //    - circle (endpoints, intermediary points)
    ];

    return mapLayers;
  }

  private setSourceFeatures(features: GeoJSON.Feature[], sourceId: string) {
    const source = this.map.getSource(sourceId) as mapboxgl.GeoJSONSource
    const featureCollection: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: features
    };
    
    source.setData(featureCollection);
  }

  private computeGeoJSON(mapTripLegs: TripLegData[]): GeoJSON.FeatureCollection {
    const features: GeoJSON.Feature[] = [];
    const legs = mapTripLegs.map(el => el.leg);

    legs.forEach((leg, idx) => {
      const forceLinkProjection = mapTripLegs[idx].map.showPreciseLine;

      const useBeeLine = !forceLinkProjection;
      const tripLegGeoController = new TripLegGeoController(leg, useBeeLine);

      const legFeatures = tripLegGeoController.computeGeoJSONFeatures();

      legFeatures.forEach(feature => {
        if (feature.geometry.type === 'LineString') {
          if (mapTripLegs[idx].map.show) {
            features.push(feature);     
          }
        } else {
          features.push(feature);
        }
      });

      if (mapTripLegs[idx].map.showOtherProvider) {
        const legLinesFeature = legFeatures.find(el => el.geometry.type === 'LineString') ?? null;
        if (legLinesFeature && legLinesFeature.properties) {
          const legShapeResultFeatures = mapTripLegs[idx].map.legShapeResult?.fc.features ?? [];
          legShapeResultFeatures.forEach(shapeProviderFeature => {
            shapeProviderFeature.properties = Object.assign({}, legLinesFeature.properties);
            const drawType: TripLegDrawType = shapeProviderFeature.properties[TripLegPropertiesEnum.DrawType];
            
            if (drawType === 'LegLine') {
              const newDrawType: TripLegDrawType = 'LegLineP2';
              shapeProviderFeature.properties[TripLegPropertiesEnum.DrawType] = newDrawType;
            }
            if (drawType === 'WalkLine') {
              const newDrawType: TripLegDrawType = 'WalkLineP2';
              shapeProviderFeature.properties[TripLegPropertiesEnum.DrawType] = newDrawType;
            }

            features.push(shapeProviderFeature);
          });
        }
      }
    });

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: features,
    };

    return geojson;
  }
}
