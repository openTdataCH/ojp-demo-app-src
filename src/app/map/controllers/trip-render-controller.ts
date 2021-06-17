import mapboxgl from "mapbox-gl";

import * as OJP from '../../shared/ojp-sdk/index'

import tripLegEndpointCircleLayer from './map-layers-def/ojp-trip-leg-endpoint-circle.json'
import tripLegBeelineLayer from './map-layers-def/ojp-trip-leg-beeline.json'
import tripLegTrackSectionLayer from './map-layers-def/ojp-trip-leg-track-section.json'

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
      this.setSourceFeatures(geojson.features)
    } else {
      this.removeAllFeatures()
    }
  }

  private addMapSourceAndLayers() {
    this.map.addSource(this.mapSourceId, <mapboxgl.GeoJSONSourceRaw>{
      type: 'geojson',
      data: <GeoJSON.FeatureCollection>{
        'type': 'FeatureCollection',
        'features': []
      }
    });

    const mapLayers = [tripLegBeelineLayer, tripLegTrackSectionLayer, tripLegEndpointCircleLayer]
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
    source.setData(featureCollection)
  }
}
