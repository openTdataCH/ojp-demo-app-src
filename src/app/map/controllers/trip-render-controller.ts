import * as GeoJSON from 'geojson';
import mapgl from 'maplibre-gl';

import tripLegBeelineLayerJSON from './map-layers-def/ojp-trip-leg-beeline.json';
import tripLegBeelineOuterLayerJSON from './map-layers-def/ojp-trip-leg-beeline-outer.json';
import tripLegLabelLayerJSON from './map-layers-def/ojp-trip-leg-label.json';

import tripTimedLegEndpointFromCircleLayerJSON from './map-layers-def/ojp-trip-timed-leg-endpoint-from-circle.json';
import tripTimedLegEndpointIntermediateCircleLayerJSON from './map-layers-def/ojp-trip-timed-leg-endpoint-intermediate-circle.json';
import tripTimedLegEndpointToCircleLayerJSON from './map-layers-def/ojp-trip-timed-leg-endpoint-to-circle.json';

import tripLegLineLayerJSON from './map-layers-def/ojp-trip-timed-leg-track.json';
import tripLegLineOuterLayerJSON from './map-layers-def/ojp-trip-timed-leg-track-outer.json';
import tripLegLineLayerP2JSON from './map-layers-def/ojp-trip-timed-leg-track-p2.json';
import tripLegLineLayerP2OuterJSON from './map-layers-def/ojp-trip-timed-leg-track-p2-outer.json';

import tripLegWalkingLineLayerJSON from './map-layers-def/ojp-trip-walking-leg-line.json';
import tripLegWalkingLineOuterLayerJSON from './map-layers-def/ojp-trip-walking-leg-line-outer.json';
import tripLegWalkingLineLayerP2JSON from './map-layers-def/ojp-trip-walking-leg-line-p2.json';
import tripLegWalkingLineLayerP2OuterJSON from './map-layers-def/ojp-trip-walking-leg-line-p2-outer.json';

import { TripLegGeoController } from '../../shared/controllers/trip-geo-controller';

import { TripLegData } from '../../shared/types/trip';
import { TripLegDrawType, TripLegPropertiesEnum } from '../../shared/types/map-geometry-types';

export class TripRenderController {
  private map: mapgl.Map;
  private mapSourceId = 'trip-data';

  constructor(map: mapgl.Map) {
    this.map = map;
    this.addMapSourceAndLayers();
  }

  public renderTrip(mapTripLegs: TripLegData[]) {
    const geojson = this.computeGeoJSON(mapTripLegs);

    this.setSourceFeatures(geojson.features, this.mapSourceId);
  }

  private addMapSourceAndLayers() {
    const source: mapgl.GeoJSONSourceSpecification = {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    };

    this.map.addSource(this.mapSourceId, source);

    const mapLayers = this.computeMapLayers();


    mapLayers.forEach(mapLayerJSON => {
      const mapLayerDef = {
        ...mapLayerJSON,
        source: this.mapSourceId,
      } as mapgl.LayerSpecification;
      this.map.addLayer(mapLayerDef as mapgl.LayerSpecification);
    });
  }

  private computeMapLayers(): mapgl.LayerSpecification[] {
    const tripLegBeelineLayer = tripLegBeelineLayerJSON as mapgl.LineLayerSpecification;
    const tripLegBeelineOuterLayer = tripLegBeelineOuterLayerJSON as mapgl.LineLayerSpecification;
    const tripLegLabelLayer = tripLegLabelLayerJSON as mapgl.SymbolLayerSpecification;
    
    const tripTimedLegEndpointFromCircleLayer = tripTimedLegEndpointFromCircleLayerJSON as mapgl.CircleLayerSpecification;
    const tripTimedLegEndpointIntermediateCircleLayer = tripTimedLegEndpointIntermediateCircleLayerJSON as mapgl.CircleLayerSpecification;
    const tripTimedLegEndpointToCircleLayer = tripTimedLegEndpointToCircleLayerJSON as mapgl.CircleLayerSpecification;
    
    const tripLegLineLayer = tripLegLineLayerJSON as mapgl.LineLayerSpecification;
    const tripLegLineOuterLayer = tripLegLineOuterLayerJSON as mapgl.LineLayerSpecification;
    const tripLegLineP2Layer = tripLegLineLayerP2JSON as mapgl.LineLayerSpecification;
    const tripLegLineP2OuterLayer = tripLegLineLayerP2OuterJSON as mapgl.LineLayerSpecification;
    
    const tripLegWalkingLineLayer = tripLegWalkingLineLayerJSON as mapgl.LineLayerSpecification;
    const tripLegWalkingLineOuterLayer = tripLegWalkingLineOuterLayerJSON as mapgl.LineLayerSpecification;
    const tripLegWalkingLineP2Layer = tripLegWalkingLineLayerP2JSON as mapgl.LineLayerSpecification;
    const tripLegWalkingLineP2OuterLayer = tripLegWalkingLineLayerP2OuterJSON as mapgl.LineLayerSpecification;

    const mapLayers = [                             // layers order matters:
      tripLegBeelineOuterLayer,                     //    - line (beeline casing)
      tripLegBeelineLayer,                          //    - line (beelines)
      
      tripLegWalkingLineP2OuterLayer,               //    - line (provider 2 - casing)
      tripLegWalkingLineP2Layer,                    //    - line (provider 2)
      tripLegWalkingLineOuterLayer,                 //    - line (casing)
      tripLegWalkingLineLayer,                      //    - line

      tripLegLineP2OuterLayer,                      //    - line provider 2 + casing
      tripLegLineP2Layer,                           //    -  + casing

      tripLegLineOuterLayer,                        //    - line (casing)
      tripLegLineLayer,                             //    - line

      tripTimedLegEndpointIntermediateCircleLayer,  //    - circle (endpoints, intermediary points)
      tripTimedLegEndpointToCircleLayer,            //    - circle (endpoints, intermediary points)
      tripTimedLegEndpointFromCircleLayer,          //    - circle (endpoints, intermediary points)

      tripLegLabelLayer,                            //    - symbol (always above all trip layers)
    ];

    return mapLayers;
  }

  private setSourceFeatures(features: GeoJSON.Feature[], sourceId: string) {
    const source = this.map.getSource(sourceId) as mapgl.GeoJSONSource
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

      if (mapTripLegs[idx].map.show) {
        const labelFeature = this.computeLegLabelFeature(mapTripLegs[idx], legFeatures);
        if (labelFeature) {
          features.push(labelFeature);
        }
      }
    });

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: features,
    };

    return geojson;
  }

  private computeLegLabel(legData: TripLegData, directionMarker: string): string {
    return `${directionMarker} Leg ${legData.info.id}`;
  }

  private computeLegLabelFeature(legData: TripLegData, features: GeoJSON.Feature[]): GeoJSON.Feature<GeoJSON.Point> | null {
    const lineFeatures = features.filter(
      (feature): feature is GeoJSON.Feature<GeoJSON.LineString> => feature.geometry.type === 'LineString',
    );

    const segments: Array<{ from: GeoJSON.Position, to: GeoJSON.Position, length: number }> = [];
    lineFeatures.forEach(feature => {
      const coordinates = feature.geometry.coordinates;
      for (let idx = 1; idx < coordinates.length; idx += 1) {
        const from = coordinates[idx - 1];
        const to = coordinates[idx];
        const averageLatitude = (from[1] + to[1]) / 2 * Math.PI / 180;
        const longitudeDistance = (to[0] - from[0]) * Math.cos(averageLatitude);
        const latitudeDistance = to[1] - from[1];
        const length = Math.hypot(longitudeDistance, latitudeDistance);
        if (length > 0) {
          segments.push({ from, to, length });
        }
      }
    });

    const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
    if (totalLength === 0) {
      return null;
    }

    const midpointDistance = totalLength / 2;
    let traversedDistance = 0;
    const midpointSegment = segments.find(segment => {
      traversedDistance += segment.length;
      return traversedDistance >= midpointDistance;
    });
    if (!midpointSegment) {
      return null;
    }

    const distanceBeforeSegment = traversedDistance - midpointSegment.length;
    const segmentRatio = (midpointDistance - distanceBeforeSegment) / midpointSegment.length;
    const midpoint: GeoJSON.Position = [
      midpointSegment.from[0] + (midpointSegment.to[0] - midpointSegment.from[0]) * segmentRatio,
      midpointSegment.from[1] + (midpointSegment.to[1] - midpointSegment.from[1]) * segmentRatio,
    ];

    const longitudeDelta = midpointSegment.to[0] - midpointSegment.from[0];
    const latitudeDelta = midpointSegment.to[1] - midpointSegment.from[1];
    let rotation = Math.atan2(-latitudeDelta, longitudeDelta) * 180 / Math.PI;
    let directionMarker = '>>';
    if (rotation > 90) {
      rotation -= 180;
      directionMarker = '<<';
    } else if (rotation < -90) {
      rotation += 180;
      directionMarker = '<<';
    }

    const drawType: TripLegDrawType = 'LegLabel';
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: midpoint,
      },
      properties: {
        [TripLegPropertiesEnum.DrawType]: drawType,
        [TripLegPropertiesEnum.Label]: this.computeLegLabel(legData, directionMarker),
        [TripLegPropertiesEnum.LabelRotation]: rotation,
      },
    };
  }
}
