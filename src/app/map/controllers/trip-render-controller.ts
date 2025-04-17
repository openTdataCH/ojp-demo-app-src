import * as GeoJSON from 'geojson';

import { MapboxLayerHelpers } from '../../helpers/mapbox-layer-helpers';
import { MapLegTypeColor } from '../../config/map-colors';

import { TripLegGeoController } from '../../shared/controllers/trip-geo-controller';
import { MapTrip, MapTripLeg } from '../../shared/types/map-geometry-types';

import tripLegBeelineLayerJSON from './map-layers-def/ojp-trip-leg-beeline.json'
import tripTimedLegEndpointCircleLayerJSON from './map-layers-def/ojp-trip-timed-leg-endpoint-circle.json'
import tripTimedLegTrackLayerJSON from './map-layers-def/ojp-trip-timed-leg-track.json'
import tripContinousLegWalkingLineLayerJSON from './map-layers-def/ojp-trip-walking-leg-line.json'

export class TripRenderController {
  private map: mapboxgl.Map
  private mapSourceId = 'trip-data'
  private features: GeoJSON.Feature[] = []

  constructor(map: mapboxgl.Map) {
    this.map = map
    this.addMapSourceAndLayers()
  }

  public renderTrip(mapTripLegs: MapTripLeg[]) {
    const geojson = this.computeGeoJSON(mapTripLegs);
    this.setSourceFeatures(geojson.features);
  }

  private addMapSourceAndLayers() {
    this.map.addSource(this.mapSourceId, <mapboxgl.GeoJSONSourceSpecification>{
      type: 'geojson',
      data: <GeoJSON.FeatureCollection>{
        'type': 'FeatureCollection',
        'features': []
      }
    });

    const tripLegBeelineLayer = tripLegBeelineLayerJSON as mapboxgl.LineLayerSpecification;
    tripLegBeelineLayer.filter = MapboxLayerHelpers.FilterBeelines();
    if (tripLegBeelineLayer.paint) {
      tripLegBeelineLayer.paint["line-color"] = MapboxLayerHelpers.ColorCaseByLegLineType();
    }

    const caseTimedLegColors = MapboxLayerHelpers.ColorCaseByLegLineType();

    const tripTimedLegEndpointCircleLayer = tripTimedLegEndpointCircleLayerJSON as mapboxgl.CircleLayerSpecification;
    tripTimedLegEndpointCircleLayer.filter = MapboxLayerHelpers.FilterLegPoints();
    if (tripTimedLegEndpointCircleLayer.paint) {
      const caseCircleRadius: mapboxgl.ExpressionSpecification = [
        'case',
        MapboxLayerHelpers.FilterByPointType('From'),
        4.0,
        MapboxLayerHelpers.FilterByPointType('To'),
        8.0,
        2.0
      ];
      tripTimedLegEndpointCircleLayer.paint["circle-radius"] = caseCircleRadius;

      const caseCircleColor: mapboxgl.ExpressionSpecification = [
        'case',
        MapboxLayerHelpers.FilterByPointType('To'),
        caseTimedLegColors,
        '#FFF'
      ];
      tripTimedLegEndpointCircleLayer.paint["circle-color"] = caseCircleColor;

      const caseCircleStrokeColor: mapboxgl.ExpressionSpecification = [
        'case',
        MapboxLayerHelpers.FilterByPointType('To'),
        '#FFF',
        caseTimedLegColors,
      ];
      tripTimedLegEndpointCircleLayer.paint["circle-stroke-color"] = caseCircleStrokeColor;

      const caseCircleStrokeWidth: mapboxgl.ExpressionSpecification = [
        'case',
        MapboxLayerHelpers.FilterByPointType('From'),
        4.0,
        MapboxLayerHelpers.FilterByPointType('To'),
        1.0,
        3.0
      ];
      tripTimedLegEndpointCircleLayer.paint["circle-stroke-width"] = caseCircleStrokeWidth;
    }

    const tripTimedLegTrackLayerLayer = tripTimedLegTrackLayerJSON as mapboxgl.LineLayerSpecification;
    tripTimedLegTrackLayerLayer.filter = MapboxLayerHelpers.FilterTimedLegTracks();
    if (tripTimedLegTrackLayerLayer.paint) {
      tripTimedLegTrackLayerLayer.paint["line-color"] = caseTimedLegColors;
    }

    const tripContinousLegWalkingLineLayer = tripContinousLegWalkingLineLayerJSON as mapboxgl.LineLayerSpecification;
    tripContinousLegWalkingLineLayer.filter = MapboxLayerHelpers.FilterWalkingLegs();
    if (tripContinousLegWalkingLineLayer.paint) {
      tripContinousLegWalkingLineLayer.paint["line-color"] = MapLegTypeColor['ContinuousLeg'];
    }

    const mapLayers = [
      tripLegBeelineLayer,
      tripTimedLegTrackLayerLayer,
      tripContinousLegWalkingLineLayer,
      tripTimedLegEndpointCircleLayer
    ]

    mapLayers.forEach(mapLayerJSON => {
      const mapLayerDef = mapLayerJSON as mapboxgl.Layer
      mapLayerDef.source = this.mapSourceId
      this.map.addLayer(mapLayerDef as mapboxgl.LayerSpecification);
    });
  }

  private removeAllFeatures() {
    // Prevent firing again the 'idle' event when setting empty features
    //    on a already empty source
    const hasNoFeatures = this.features.length === 0;
    if (hasNoFeatures) {
      return;
    }

    this.setSourceFeatures([]);
  }

  private setSourceFeatures(features: GeoJSON.Feature[]) {
    this.features = features;

    const source = this.map.getSource(this.mapSourceId) as mapboxgl.GeoJSONSource
    const featureCollection = <GeoJSON.FeatureCollection>{
      'type': 'FeatureCollection',
      'features': features
    }
    source.setData(featureCollection);
  }

  private computeGeoJSON(mapTripLegs: MapTripLeg[]): GeoJSON.FeatureCollection {
    let features: GeoJSON.Feature[] = [];
    const legs = mapTripLegs.map(el => el.leg);

    legs.forEach((leg, idx) => {
      const forceLinkProjection = mapTripLegs[idx].forceLinkProjection;

      const useBeeLine = !forceLinkProjection;
      const tripLegGeoController = new TripLegGeoController(leg, useBeeLine);

      const legFeatures = tripLegGeoController.computeGeoJSONFeatures();
      
      features = features.concat(legFeatures);
    });

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: features,
    };

    return geojson;
  }
}
