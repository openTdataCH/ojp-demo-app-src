import * as GeoJSON from 'geojson'
import mapboxgl from "mapbox-gl";

interface NearbyFeature {
  distance: number
  feature: mapboxgl.GeoJSONFeature
}

export class MapHelpers {
  public static formatMapboxLngLatAsLatLng(lnglat: mapboxgl.LngLat): string {
    const lnglatS = lnglat.lat.toFixed(6) + ',' + lnglat.lng.toFixed(6);
    return lnglatS;
  }

  public static computePointLngLatFromFeature(feature: GeoJSON.Feature): mapboxgl.LngLat | null {
    if (feature.geometry.type !== 'Point') {
      return null
    }

    const featureCoords: mapboxgl.LngLatLike = (feature.geometry as GeoJSON.Point).coordinates as [number, number]
    const featureLngLat = mapboxgl.LngLat.convert(featureCoords)

    return featureLngLat
  }

  public static bboxPxFromLngLatWidthPx(map: mapboxgl.Map, lngLat: mapboxgl.LngLat, width: number, height: number | null = null): [mapboxgl.PointLike, mapboxgl.PointLike] {
    if (height === null) {
      height = width
    }

    const pointPx = map.project(lngLat);
    const bboxPx: [mapboxgl.PointLike, mapboxgl.PointLike] = [
      [
        pointPx.x - width / 2,
        pointPx.y + height / 2,
      ],
      [
        pointPx.x + width / 2,
        pointPx.y - height / 2,
      ]
    ]

    return bboxPx
  }

  public static areBoundsInsideOtherBounds(bounds: mapboxgl.LngLatBounds, otherBounds: mapboxgl.LngLatBounds): boolean {
    if (bounds.getWest() < otherBounds.getWest()) {
      return false
    }

    if (bounds.getNorth() > otherBounds.getNorth()) {
      return false
    }

    if (bounds.getEast() > otherBounds.getEast()) {
      return false
    }

    if (bounds.getSouth() < otherBounds.getSouth()) {
      return false
    }

    return true
  }

  public static queryNearbyFeaturesByLayerIDs(map: mapboxgl.Map, lngLat: mapboxgl.LngLat, layerIDs: string[]): NearbyFeature[] {
    const bboxPx = MapHelpers.bboxPxFromLngLatWidthPx(map, lngLat, 30);
    const features = map.queryRenderedFeatures(bboxPx, {
      layers: layerIDs
    });

    let nearbyFeatures: NearbyFeature[] = [];
    let minDistance: number | null = null;
    features.forEach(feature => {
      const featureLngLat = MapHelpers.computePointLngLatFromFeature(feature);
      if (featureLngLat === null) {
        return;
      }

      const featureDistance = Math.round(lngLat.distanceTo(featureLngLat));
      if ((minDistance !== null) && (featureDistance > minDistance)) {
        return;
      }

      minDistance = featureDistance;

      const nearbyFeature: NearbyFeature = {
        feature: feature,
        distance: featureDistance
      };
      nearbyFeatures.push(nearbyFeature);
    });

    nearbyFeatures.sort((a,b) => a.distance - b.distance);

    // Highlight area clicked
    MapHelpers.highlightBBOXPxOnMap(bboxPx, map)
    MapHelpers.highlightLngLatOnMap(lngLat, map)

    return nearbyFeatures;
  }

  public static highlightBBOXPxOnMap(bboxPx: [mapboxgl.PointLike, mapboxgl.PointLike], map: mapboxgl.Map) {
    const coordSW = map.unproject(bboxPx[0]);
    const coordNE = map.unproject(bboxPx[1]);
    const bbox = new mapboxgl.LngLatBounds(coordSW, coordNE);
    const featureCoords: GeoJSON.Position[] = [
      bbox.getSouthWest().toArray(),
      bbox.getSouthEast().toArray(),
      bbox.getNorthEast().toArray(),
      bbox.getNorthWest().toArray(),
      bbox.getSouthWest().toArray(),
    ];
    
    const feature = <GeoJSON.Feature>{
      type: 'Feature',
      properties: {},
      geometry: <GeoJSON.LineString>{
        type: 'LineString',
        coordinates: featureCoords,
      },
    };
    
    const sourceID = 'debug-highlight';
    if (!map.getSource(sourceID)) {
      const source = <mapboxgl.GeoJSONSourceSpecification>{
        type: 'geojson',
        data: <GeoJSON.FeatureCollection>{
          type: 'FeatureCollection',
          features: [],
        },
      };
      map.addSource(sourceID, source)
    }
    
    const layerID = sourceID + '-bbox';
    if (!map.getLayer(layerID)) {
      const layer = <mapboxgl.LineLayerSpecification>{
        id: layerID,
        type: 'line',
        source: sourceID,
        paint: <mapboxgl.LineLayerSpecification['paint']>{
          'line-color': '#630000',
          'line-width': 2,
        },
      };
      map.addLayer(layer);
    }
    
    const source = map.getSource(sourceID) as mapboxgl.GeoJSONSource;
    source.setData(<GeoJSON.FeatureCollection>{
      type: 'FeatureCollection',
      features: [feature],
    });
    
    setTimeout(() => {
      source.setData(<GeoJSON.FeatureCollection>{
        type: 'FeatureCollection',
        features: [],
      })
    }, 500);
  }
  
  public static highlightLngLatOnMap(lngLat: mapboxgl.LngLat, map: mapboxgl.Map) {
    const feature = <GeoJSON.Feature>{
      type: 'Feature',
      properties: {},
      geometry: <GeoJSON.Point>{
        type: 'Point',
        coordinates: lngLat.toArray(),
      },
    };
    
    const sourceID = 'debug-highlight-layer-coord';
    if (!map.getSource(sourceID)) {
      const source = <mapboxgl.GeoJSONSourceSpecification>{
        type: 'geojson',
        data: <GeoJSON.FeatureCollection>{
          type: 'FeatureCollection',
          features: [],
        },
      };
      map.addSource(sourceID, source)
    }
    
    const layerID = sourceID + '-coords';
    if (!map.getLayer(layerID)) {
      const layer = <mapboxgl.CircleLayerSpecification>{
        id: layerID,
        type: 'circle',
        source: sourceID,
        paint: <mapboxgl.CircleLayerSpecification['paint']>{
          'circle-color': '#630000',
          'circle-radius': 4
        },
      };
      map.addLayer(layer);
    }
    
    const source = map.getSource(sourceID) as mapboxgl.GeoJSONSource;
    source.setData(<GeoJSON.FeatureCollection>{
      type: 'FeatureCollection',
      features: [feature],
    })
    
    setTimeout(() => {
      source.setData(<GeoJSON.FeatureCollection>{
        type: 'FeatureCollection',
        features: [],
      })
    }, 500);
  }
}
