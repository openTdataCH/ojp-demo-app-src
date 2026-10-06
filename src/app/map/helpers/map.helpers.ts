import * as OJP from 'ojp-sdk';

import * as GeoJSON from 'geojson'
import mapgl from "maplibre-gl";

interface NearbyFeature {
  distance: number
  feature: mapgl.MapGeoJSONFeature
}

type WebMercatorPoint = { x: number; y: number };

export class MapHelpers {
  public static expandBoundsToGrid(
    bounds: mapgl.LngLatBounds,
    gridSize: number = 9,
    gridStepRatio: number = 0.5,
  ): mapgl.LngLatBounds {
    if (gridSize < 1 || gridSize % 2 === 0) {
      throw new Error('gridSize must be a positive odd number');
    }

    const gridRadius = Math.floor(gridSize / 2);
    const longitudeExpansion = (bounds.getEast() - bounds.getWest()) * gridStepRatio * gridRadius;
    const latitudeExpansion = (bounds.getNorth() - bounds.getSouth()) * gridStepRatio * gridRadius;

    return new mapgl.LngLatBounds(
      [bounds.getWest() - longitudeExpansion, bounds.getSouth() - latitudeExpansion],
      [bounds.getEast() + longitudeExpansion, bounds.getNorth() + latitudeExpansion],
    );
  }

  public static computePointLngLatFromFeature(feature: GeoJSON.Feature): mapgl.LngLat | null {
    if (feature.geometry.type !== 'Point') {
      return null;
    }

    const featureCoords: mapgl.LngLatLike = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
    const featureLngLat = mapgl.LngLat.convert(featureCoords);

    return featureLngLat;
  }

  private static bboxPxFromLngLatWidthPx(map: mapgl.Map, lngLat: mapgl.LngLat, width: number, height: number | null = null): [mapgl.PointLike, mapgl.PointLike] {
    if (height === null) {
      height = width;
    }

    const pointPx = map.project(lngLat);
    const bboxPx: [mapgl.PointLike, mapgl.PointLike] = [
      [
        pointPx.x - width / 2,
        pointPx.y + height / 2,
      ],
      [
        pointPx.x + width / 2,
        pointPx.y - height / 2,
      ]
    ];

    return bboxPx;
  }

  private static bboxPxToLngLatBounds(map: mapgl.Map, bboxPx: [mapgl.PointLike, mapgl.PointLike]): mapgl.LngLatBounds {
    const coordSW = map.unproject(bboxPx[0]);
    const coordNE = map.unproject(bboxPx[1]);
    const bbox = new mapgl.LngLatBounds(coordSW, coordNE);

    return bbox;
  }

  public static bboxFromLngLatWidthPx(map: mapgl.Map, lngLat: mapgl.LngLat, width: number, height: number | null = null): number[] {
    const bboxPx = MapHelpers.bboxPxFromLngLatWidthPx(map, lngLat, width, height);
    const bboxLngLatBounds = MapHelpers.bboxPxToLngLatBounds(map, bboxPx);
    const bbox: number[] = [
      bboxLngLatBounds.getWest(),
      bboxLngLatBounds.getSouth(),
      bboxLngLatBounds.getEast(),
      bboxLngLatBounds.getNorth(),
    ];
    
    return bbox;
  }

  public static areBoundsInsideOtherBounds(bounds: mapgl.LngLatBounds, otherBounds: mapgl.LngLatBounds): boolean {
    if (bounds.getWest() < otherBounds.getWest()) {
      return false;
    }

    if (bounds.getNorth() > otherBounds.getNorth()) {
      return false;
    }

    if (bounds.getEast() > otherBounds.getEast()) {
      return false;
    }

    if (bounds.getSouth() < otherBounds.getSouth()) {
      return false;
    }

    return true;
  }

  public static queryNearbyFeaturesByLayerIDs(map: mapgl.Map, lngLat: mapgl.LngLat, layerIDs: string[]): NearbyFeature[] {
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
    MapHelpers.highlightBBOXPxOnMap(bboxPx, map);
    MapHelpers.highlightLngLatOnMap(lngLat, map);

    return nearbyFeatures;
  }

  private static highlightBBOXPxOnMap(bboxPx: [mapgl.PointLike, mapgl.PointLike], map: mapgl.Map) {
    const bbox = MapHelpers.bboxPxToLngLatBounds(map, bboxPx);
    MapHelpers.highlightLngLatBoundsOnMap(bbox, map);
  }

  public static highlightBBOXOnMap(bbox: number[], map: mapgl.Map) {
    const bboxLngLatBounds = new mapgl.LngLatBounds(bbox as [number, number, number, number]);
    MapHelpers.highlightLngLatBoundsOnMap(bboxLngLatBounds, map);
  }
  
  private static highlightLngLatBoundsOnMap(bboxLngLatBounds: mapgl.LngLatBounds, map: mapgl.Map) {
    const featureCoords: GeoJSON.Position[] = [
      bboxLngLatBounds.getSouthWest().toArray(),
      bboxLngLatBounds.getSouthEast().toArray(),
      bboxLngLatBounds.getNorthEast().toArray(),
      bboxLngLatBounds.getNorthWest().toArray(),
      bboxLngLatBounds.getSouthWest().toArray(),
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
      const source = <mapgl.GeoJSONSourceSpecification>{
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
      const layer = <mapgl.LineLayerSpecification>{
        id: layerID,
        type: 'line',
        source: sourceID,
        paint: <mapgl.LineLayerSpecification['paint']>{
          'line-color': '#630000',
          'line-width': 2,
        },
      };
      map.addLayer(layer);
    }
    
    const source = map.getSource(sourceID) as mapgl.GeoJSONSource;
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
  
  public static highlightLngLatOnMap(lngLat: mapgl.LngLat, map: mapgl.Map) {
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
      const source = <mapgl.GeoJSONSourceSpecification>{
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
      const layer = <mapgl.CircleLayerSpecification>{
        id: layerID,
        type: 'circle',
        source: sourceID,
        paint: <mapgl.CircleLayerSpecification['paint']>{
          'circle-color': '#630000',
          'circle-radius': 4
        },
      };
      map.addLayer(layer);
    }
    
    const source = map.getSource(sourceID) as mapgl.GeoJSONSource;
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

  public static computeGeoPositionsDistance(positions: OJP.GeoPosition[]): number | null {
    if (positions.length < 2) {
      return null;
    }

    let dAB = 0;
    positions.forEach((position, idx) => {
      const isFirst = idx === 0;
      if (isFirst) {
        return;
      }

      const prevPosition = positions[idx - 1];
      dAB += position.distanceFrom(prevPosition);
    });

    return dAB;
  } 

  public static lngLatToWebMercator(longitude: number, latitude: number): WebMercatorPoint {
    const R = 6378137;
    const x = R * longitude * Math.PI / 180;
    const y = R * Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360));
    
    return { x, y };
  }
}
