import { Injectable, EventEmitter } from '@angular/core'

import mapgl from 'maplibre-gl';

import { SbbDialog } from '@sbb-esta/angular/dialog';

import { UserTripService } from './user-trip.service';
import { MapHelpers } from '../../map/helpers/map.helpers'
import { MapDebugControl } from '../../map/controls/map-debug-control'
import { MapLayersLegendControl } from '../../map/controls/map-layers-legend-control';
import { LanguageService } from './language.service';
import { TripGeoController } from '../controllers/trip-geo-controller';
import { MAP_HIDDEN_BASE_LAYER_IDS, MAP_RASTER_LAYERS } from '../../config/constants';
import { AnyPlace } from '../models/place/place-builder';
import { Trip } from '../models/trip/trip';
import { APP_CONFIG } from '../../config/app-config';

export interface IMapBoundsData {
  bounds: mapgl.LngLatBounds
  onlyIfOutside?: boolean | null
  padding?: mapgl.PaddingOptions | null
  disableEase?: boolean | null
}

export interface IMapLocationZoomData {
  lnglat: mapgl.LngLatLike
  zoom: number
}

@Injectable( {providedIn: 'root'} )
export class MapService {
  public newMapBoundsRequested = new EventEmitter<IMapBoundsData>();
  public newMapCenterAndZoomRequested = new EventEmitter<IMapLocationZoomData>();

  public initialMapCenter: mapgl.LngLat | null
  public initialMapZoom: number | null

  constructor() {
    this.initialMapCenter = null;
    this.initialMapZoom = null;
  }

  public createMap(elementID: string): mapgl.Map {
    const mapBounds = new mapgl.LngLatBounds([[5.9559,45.818], [10.4921,47.8084]]);

    const geopsAPIKey = APP_CONFIG['stages']['SHAPE_PROVIDER'].authToken ?? '';
    const mapStyleURL = `https://maps.geops.io/styles/base_bright_v2/style.json?key=${encodeURIComponent(geopsAPIKey)}`;

    const map = new mapgl.Map({
      container: elementID,
      style: mapStyleURL,
      bounds: mapBounds,
    });

    map.on('load', () => {
      this.hideBaseLayers(map);
    });

    if (this.initialMapCenter) {
      map.setCenter(this.initialMapCenter);
      if (this.initialMapZoom) {
        map.setZoom(this.initialMapZoom);
      }
    } else {
      map.fitBounds(mapBounds, {
        padding: 50,
        duration: 0,
      });
    }

    return map;
  }

  private hideBaseLayers(map: mapgl.Map) {
    MAP_HIDDEN_BASE_LAYER_IDS.forEach(layerID => {
      if (map.getLayer(layerID) === undefined) {
        console.error(`Unable to hide base layer "${layerID}": layer does not exist in the current map style.`);
        return;
      }

      map.setLayoutProperty(layerID, 'visibility', 'none');
    });
  }

  public tryToCenterAndZoomToPlace(place: AnyPlace, zoomValue: number = 16.0) {
    this.newMapCenterAndZoomRequested.emit({
      lnglat: place.geoPosition.asLngLat(),
      zoom: zoomValue,
    });
  }

  public zoomToTrip(trip: Trip) {
    const tripController = new TripGeoController(trip);

    const bbox = tripController.computeBBOX();
    if (bbox.isValid() === false) {
      return;
    }

    const bounds = new mapgl.LngLatBounds(bbox.asFeatureBBOX())
    const mapData = {
      bounds: bounds
    }
    
    this.newMapBoundsRequested.emit(mapData);
  }

  public zoomToBounds(map: mapgl.Map, mapData: IMapBoundsData) {
    const newBounds = mapData.bounds;

    const minDistanceM = 20
    const hasSmallBBOX = newBounds.getSouthWest().distanceTo(newBounds.getNorthEast()) < minDistanceM
    if (hasSmallBBOX) {
      map.jumpTo({
        center: newBounds.getCenter(),
        zoom: 16
      });

      return;
    }

    const padding = mapData.padding ?? {
      left: 50,
      top: 170,
      right: 50,
      bottom: 100,
    };
    
    const onlyIfOutside = mapData.onlyIfOutside ?? false;
    const mapBounds = map.getBounds();
    if (onlyIfOutside && mapBounds) {

      const isInside = MapHelpers.areBoundsInsideOtherBounds(newBounds, mapBounds);
      if (isInside) {
        return;
      }
    }

    const easingOptions: mapgl.FitBoundsOptions = {
      padding: padding,
    };

    if (mapData.disableEase) {
      easingOptions.duration = 0;
    }

    map.fitBounds(newBounds, easingOptions);
  }

  public zoomToLocation(map: mapgl.Map, mapData: IMapLocationZoomData) {
    map.flyTo({
      center: mapData.lnglat,
      zoom: mapData.zoom
    });
  }

  public addControls(map: mapgl.Map, debugXmlPopover: SbbDialog, userTripService: UserTripService, languageService: LanguageService) {
    const navigationControl = new mapgl.NavigationControl({
      showCompass: false,
      visualizePitch: false
    });
    map.addControl(navigationControl, 'bottom-right');

    const scaleControl = new mapgl.ScaleControl({
        maxWidth: 200,
        unit: 'metric'
    });
    map.addControl(scaleControl);

    const debugControl = new MapDebugControl(map);
    map.addControl(debugControl, 'top-left');

    // The map type select is added via innerHTML, so Angular change binding is unavailable here.
    const select = document.getElementById('mapTypeSelect') as HTMLSelectElement;
    if (select) {
      select.addEventListener('change', () => {
        this.mapTypeChanged(map, select.value);
      });
    }

    const mapLayersLegendControl = new MapLayersLegendControl(map, debugXmlPopover, userTripService, languageService);
    map.addControl(mapLayersLegendControl, 'top-right');
  }

  public addRasterLayers(map: mapgl.Map) {
    MAP_RASTER_LAYERS.forEach(rasterLayerDef => {
      if (rasterLayerDef.beforeLayerId && map.getLayer(rasterLayerDef.beforeLayerId) === undefined) {
        console.error(
          `Unable to add raster layer "${rasterLayerDef.id}": insertion layer ` +
          `"${rasterLayerDef.beforeLayerId}" does not exist in the current map style.`,
        );
        return;
      }

      const mapSource: mapgl.RasterSourceSpecification = {
        type: 'raster',
        tiles: rasterLayerDef.tileURLs,
        tileSize: 256,
        minzoom: rasterLayerDef.minZoom,
        maxzoom: rasterLayerDef.maxZoom,
      };
      map.addSource(rasterLayerDef.id, mapSource);

      const layer: mapgl.RasterLayerSpecification = {
        id: rasterLayerDef.id,
        source: rasterLayerDef.id,
        type: 'raster',
        paint: {
          'raster-opacity': rasterLayerDef.rasterOpacity,
        },
        layout: {
          visibility: 'none',
        },
      };
      map.addLayer(layer, rasterLayerDef.beforeLayerId);
    });
  }

  private mapTypeChanged(map: mapgl.Map, mapTypeS: string) {
    MAP_RASTER_LAYERS.forEach(rasterLayerDef => {
      if (map.getLayer(rasterLayerDef.id) === undefined) {
        console.error(
          `Unable to change raster layer "${rasterLayerDef.id}": ` +
          'the layer does not exist in the current map style.',
        );
        return;
      }

      const isVisible = mapTypeS !== 'default' && rasterLayerDef.id === mapTypeS;
      map.setLayoutProperty(rasterLayerDef.id, 'visibility', isVisible ? 'visible' : 'none');
    });
  }
}
