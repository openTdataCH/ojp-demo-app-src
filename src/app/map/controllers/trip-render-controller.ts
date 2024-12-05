import * as GeoJSON from 'geojson';
import mapboxgl from 'mapbox-gl';

import * as OJP from 'ojp-sdk'

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

  public renderTrip(trip: OJP.Trip | null) {
    if (trip) {
      const geojson = trip.computeGeoJSON()
      this.setSourceFeatures(geojson.features);
    } else {
      this.removeAllFeatures();
    }
  }

  private addMapSourceAndLayers() {
    this.map.addSource(this.mapSourceId, <mapboxgl.GeoJSONSourceSpecification>{
      type: 'geojson',
      data: <GeoJSON.FeatureCollection>{
        'type': 'FeatureCollection',
        'features': []
      }
    });

    tripLegBeelineLayer.filter = OJP.MapboxLayerHelpers.FilterBeelines()
    const tripLegBeelineLayer = tripLegBeelineLayerJSON as mapboxgl.LineLayerSpecification;
    if (tripLegBeelineLayer.paint) {
      tripLegBeelineLayer.paint["line-color"] = OJP.MapboxLayerHelpers.ColorCaseByLegLineType()
    }

    const caseTimedLegColors = OJP.MapboxLayerHelpers.ColorCaseByLegLineType()

    tripTimedLegEndpointCircleLayer.filter = OJP.MapboxLayerHelpers.FilterLegPoints()
    const tripTimedLegEndpointCircleLayer = tripTimedLegEndpointCircleLayerJSON as mapboxgl.CircleLayerSpecification;
    if (tripTimedLegEndpointCircleLayer.paint) {
      const caseCircleRadius: mapboxgl.ExpressionSpecification = [
        'case',
        OJP.MapboxLayerHelpers.FilterByPointType('From'),
        4.0,
        OJP.MapboxLayerHelpers.FilterByPointType('To'),
        8.0,
        2.0
      ];
      tripTimedLegEndpointCircleLayer.paint["circle-radius"] = caseCircleRadius;

      const caseCircleColor: mapboxgl.ExpressionSpecification = [
        'case',
        OJP.MapboxLayerHelpers.FilterByPointType('To'),
        caseTimedLegColors,
        '#FFF'
      ];
      tripTimedLegEndpointCircleLayer.paint["circle-color"] = caseCircleColor;

      const caseCircleStrokeColor: mapboxgl.ExpressionSpecification = [
        'case',
        OJP.MapboxLayerHelpers.FilterByPointType('To'),
        '#FFF',
        caseTimedLegColors,
      ];
      tripTimedLegEndpointCircleLayer.paint["circle-stroke-color"] = caseCircleStrokeColor;

      const caseCircleStrokeWidth: mapboxgl.ExpressionSpecification = [
        'case',
        OJP.MapboxLayerHelpers.FilterByPointType('From'),
        4.0,
        OJP.MapboxLayerHelpers.FilterByPointType('To'),
        1.0,
        3.0
      ];
      tripTimedLegEndpointCircleLayer.paint["circle-stroke-width"] = caseCircleStrokeWidth;
    }

    tripTimedLegTrackLayerLayer.filter = OJP.MapboxLayerHelpers.FilterTimedLegTracks()
    const tripTimedLegTrackLayerLayer = tripTimedLegTrackLayerJSON as mapboxgl.LineLayerSpecification;
    if (tripTimedLegTrackLayerLayer.paint) {
      tripTimedLegTrackLayerLayer.paint["line-color"] = caseTimedLegColors;
    }

    tripContinousLegWalkingLineLayer.filter = OJP.MapboxLayerHelpers.FilterWalkingLegs()
    const tripContinousLegWalkingLineLayer = tripContinousLegWalkingLineLayerJSON as mapboxgl.LineLayerSpecification;
    if (tripContinousLegWalkingLineLayer.paint) {
      tripContinousLegWalkingLineLayer.paint["line-color"] = OJP.MapLegTypeColor['ContinousLeg']
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
      this.map.addLayer(mapLayerDef as mapboxgl.AnyLayer);
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
}
