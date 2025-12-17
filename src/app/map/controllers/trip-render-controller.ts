import * as GeoJSON from 'geojson';

import tripLegBeelineLayerJSON from './map-layers-def/ojp-trip-leg-beeline.json';

import tripTimedLegEndpointFromCircleLayerJSON from './map-layers-def/ojp-trip-timed-leg-endpoint-from-circle.json';
import tripTimedLegEndpointIntermediateCircleLayerJSON from './map-layers-def/ojp-trip-timed-leg-endpoint-intermediate-circle.json';
import tripTimedLegEndpointToCircleLayerJSON from './map-layers-def/ojp-trip-timed-leg-endpoint-to-circle.json';

import tripLegLineLayerJSON from './map-layers-def/ojp-trip-timed-leg-track.json';
import tripLegWalkingLineLayerJSON from './map-layers-def/ojp-trip-walking-leg-line.json';
import { TripLegGeoController } from '../../shared/controllers/trip-geo-controller';

import { TripLegData } from '../../shared/types/trip';

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
    
    const tripLegWalkingLineLayer = tripLegWalkingLineLayerJSON as mapboxgl.LineLayerSpecification;

    const mapLayers = [                             // layers order matters:
      tripLegBeelineLayer,                          //    - line (beelines)
      
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
      const forceLinkProjection = mapTripLegs[idx].forceLinkProjection;

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
