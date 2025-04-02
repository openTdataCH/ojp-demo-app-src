import { Component, OnInit } from '@angular/core';
import { SbbDialog } from '@sbb-esta/angular/dialog';

import mapboxgl from 'mapbox-gl'

import * as OJP from 'ojp-sdk-v2';

import { MapDebugControl } from '../../map/controls/map-debug-control'
import { MapLayersLegendControl } from '../../map/controls/map-layers-legend-control';
import { MapService } from '../../shared/services/map.service';
import { UserTripService } from '../../shared/services/user-trip.service';
import { TripInfoService } from '../trip-info.service';

import { StopEventServiceRenderer as JourneyServiceRenderer } from '../../station-board/map/stop-event-service-renderer/stop-event-service-renderer';
import { MapHelpers } from '../../map/helpers/map.helpers';
import { LanguageService } from 'src/app/shared/services/language.service';

@Component({
  selector: 'trip-info-map',
  templateUrl: './trip-info-map.component.html',
  styleUrls: ['./trip-info-map.component.scss']
})
export class TripInfoMapComponent implements OnInit {
  public mapLoadingPromise: Promise<mapboxgl.Map> | null;
  private journeyServiceRenderer: JourneyServiceRenderer | null

  constructor(
    private userTripService: UserTripService,
    private mapService: MapService,
    private debugXmlPopover: SbbDialog,
    private tripInfoService: TripInfoService,
    private languageService: LanguageService,
  ) {
    this.mapLoadingPromise = null;
    this.journeyServiceRenderer = null;
  }

  ngOnInit(): void {
    this.initMap()

    this.mapService.newMapCenterAndZoomRequested.subscribe(mapData => {
      this.mapLoadingPromise?.then(map => {
        this.mapService.zoomToLocation(map, mapData);
      });
    })

    this.tripInfoService.tripInfoResultUpdated.subscribe(tripInfoResult => {
      // Wait for the map to load
      this.mapLoadingPromise?.then(map => {
        if (tripInfoResult === null) {
          this.journeyServiceRenderer?.resetStopEventLayers();
        } else {
          this.journeyServiceRenderer?.drawServiceStopPoints(tripInfoResult.stopPoints);
          this.zoomToJourneyService();
        }
      });
    })

    this.mapService.newMapBoundsRequested.subscribe(mapData => {
      this.mapLoadingPromise?.then(map => {
        this.mapService.zoomToBounds(map, mapData);
      });
    })

    this.tripInfoService.locationSelected.subscribe(locationData => {
      const geoPosition = locationData.geoPosition ?? null;
      if (geoPosition === null) {
        return;
      }

      this.mapLoadingPromise?.then(map => {
        this.mapService.zoomToLocation(map, {
          lnglat: geoPosition.asLngLat(),
          zoom: 16,
        })
      });
    })
  }
  
  private initMap() {
    const map = this.mapService.createMap('map_canvas_trip_info');
    
    this.mapLoadingPromise = new Promise<mapboxgl.Map>((resolve, reject) => {
      map.on('load', ev => {
        resolve(map);
        this.onMapLoad(map);
      });
    });
  }

  private zoomToJourneyService() {
    const geojsonFeatures = this.journeyServiceRenderer?.geojsonFeatures ?? [];
    if (geojsonFeatures.length < 2) {
      return;
    }

    const bbox = OJP.GeoPositionBBOX.initFromGeoJSONFeatures(geojsonFeatures);
    if (!bbox.isValid()) {
      console.error('Invalid BBOX for features');
      console.log(geojsonFeatures);
      return
    }

    const bounds = new mapboxgl.LngLatBounds(bbox.asFeatureBBOX())
    const mapData = {
      bounds: bounds,
    }
    this.mapService.newMapBoundsRequested.emit(mapData);
  }

  private onMapLoad(map: mapboxgl.Map) {
    this.addMapControls(map);

    this.addMapListeners(map);

    this.journeyServiceRenderer = new JourneyServiceRenderer(map);
  }

  private addMapControls(map: mapboxgl.Map) {
    const navigationControl = new mapboxgl.NavigationControl({
      showCompass: false,
      visualizePitch: false
    });
    map.addControl(navigationControl, 'bottom-right');

    const scaleControl = new mapboxgl.ScaleControl({
      maxWidth: 200,
      unit: 'metric'
    });
    map.addControl(scaleControl);

    const debugControl = new MapDebugControl(map);
    map.addControl(debugControl, 'top-left');

    const mapLayersLegendControl = new MapLayersLegendControl(map, this.debugXmlPopover, this.userTripService, this.languageService);
    map.addControl(mapLayersLegendControl, 'top-right');
  }

  private addMapListeners(map: mapboxgl.Map) {
    map.on('styleimagemissing', ev => {
      const image_url = './assets/map-style-icons/' + ev.id + '.png';
      map.loadImage(image_url, (error, image) => {
        if (error) {
          console.error(error);
          return;
        }
        if (!map.hasImage(ev.id) && image) {
          map.addImage(ev.id, image);
        } 
      });
    });

    map.on('click', ev => {
      const nearbyFeatures = MapHelpers.queryNearbyFeaturesByLayerIDs(map, ev.lngLat, ['stops-circle', 'stops-label']);
      if (nearbyFeatures.length > 0) {
        const nearbyFeature = nearbyFeatures[0];
        
        console.log(nearbyFeature);
      }
    });
  }
}
