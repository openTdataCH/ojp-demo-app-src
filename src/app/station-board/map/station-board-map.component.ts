import { Component, OnInit } from '@angular/core';
import { SbbDialog } from '@sbb-esta/angular/dialog';
import mapboxgl from 'mapbox-gl'

import { MapDebugControl } from 'src/app/map/controls/map-debug-control';
import { MapLayersLegendControl } from 'src/app/map/controls/map-layers-legend-control';
import { MapService } from 'src/app/shared/services/map.service';
import { UserTripService } from 'src/app/shared/services/user-trip.service';
import { StationBoardService } from '../station-board.service';

import * as OJP from '../../shared/ojp-sdk/index'
import { StopEventServiceRenderer } from './stop-event-service-renderer/stop-event-service-renderer';
import { MapHelpers } from 'src/app/map/helpers/map.helpers';

@Component({
  selector: 'station-board-map',
  templateUrl: './station-board-map.component.html',
  styleUrls: ['./station-board-map.component.scss']
})
export class StationBoardMapComponent implements OnInit {
  public mapLoadingPromise: Promise<mapboxgl.Map> | null;
  private stopEventServiceRenderer: StopEventServiceRenderer | null

  constructor(
    private userTripService: UserTripService,
    private mapService: MapService,
    private debugXmlPopover: SbbDialog,
    private stationBoardService: StationBoardService
  ) {
    this.mapLoadingPromise = null;
    this.stopEventServiceRenderer = null;
  }

  ngOnInit(): void {
    this.initMap()

    this.mapService.newMapCenterAndZoomRequested.subscribe(mapData => {
      this.mapLoadingPromise?.then(map => {
        map.jumpTo({
          center: mapData.lnglat,
          zoom: mapData.zoom
        });
      });
    })

    this.stationBoardService.stationBoardEntrySelected.subscribe(stopEvent => {
      // Wait for the map to load
      this.mapLoadingPromise?.then(map => {
        this.updateMapForEntry(stopEvent);
      })
    })
  }
  
  private initMap() {
    const mapBounds = new mapboxgl.LngLatBounds([[5.9559,45.818], [10.4921,47.8084]]);
    const map = new mapboxgl.Map({
      container: 'map_canvas_station_board',
      style: 'mapbox://styles/mapbox/light-v10',
      bounds: mapBounds,
      accessToken: 'pk.eyJ1IjoidmFzaWxlIiwiYSI6ImNra2k2dWFkeDFrbG0ycXF0Nmg0Z2tsNXAifQ.nK-i-3cpWmji7HvK1Ilynw',
    });
    
    if (this.mapService.initialMapCenter) {
      map.setCenter(this.mapService.initialMapCenter)
      
      if (this.mapService.initialMapZoom) {
        map.setZoom(this.mapService.initialMapZoom)
      }
    } else {
      map.fitBounds(mapBounds, {
        padding: 50,
        duration: 0,
      });
    }
    
    this.mapLoadingPromise = new Promise<mapboxgl.Map>((resolve, reject) => {
      map.on('load', ev => {
        resolve(map);
        this.onMapLoad(map);
      });
    });
  }

  private onMapLoad(map: mapboxgl.Map) {
    this.addMapControls(map);

    this.addMapListeners(map);

    this.stopEventServiceRenderer = new StopEventServiceRenderer(map);
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

    const mapLayersLegendControl = new MapLayersLegendControl(map, this.debugXmlPopover, this.userTripService);
    map.addControl(mapLayersLegendControl, 'top-right');
  }

  private updateMapForEntry(stopEvent: OJP.StopEvent | null) {
    if (stopEvent === null) {
      this.stopEventServiceRenderer?.resetStopEventLayers();
    } else {
      this.stopEventServiceRenderer?.drawStopEvent(stopEvent);
    }
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
      const nearbyFeature = MapHelpers.queryNearbyFeatureByLayerIDs(map, ev.lngLat, ['stops-circle', 'stops-label']);
      if (nearbyFeature?.feature) {
        this.stationBoardService.stationOnMapClicked.emit(nearbyFeature?.feature);
      }
    });
  }
}
