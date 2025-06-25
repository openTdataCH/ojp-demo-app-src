import { Component, OnInit } from '@angular/core';
import { SbbDialog } from '@sbb-esta/angular/dialog';

import mapboxgl from 'mapbox-gl'
import OJP_Legacy from '../../config/ojp-legacy';

import { MapDebugControl } from 'src/app/map/controls/map-debug-control';
import { MapLayersLegendControl } from 'src/app/map/controls/map-layers-legend-control';
import { MapService } from 'src/app/shared/services/map.service';
import { UserTripService } from 'src/app/shared/services/user-trip.service';
import { StationBoardService } from '../station-board.service';

import { StopEventServiceRenderer } from './stop-event-service-renderer/stop-event-service-renderer';
import { MapHelpers } from 'src/app/map/helpers/map.helpers';
import { LanguageService } from 'src/app/shared/services/language.service';

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
    private stationBoardService: StationBoardService,
    private languageService: LanguageService
  ) {
    this.mapLoadingPromise = null;
    this.stopEventServiceRenderer = null;
  }

  ngOnInit(): void {
    this.initMap()

    this.mapService.newMapCenterAndZoomRequested.subscribe(mapData => {
      this.mapLoadingPromise?.then(map => {
        this.mapService.zoomToLocation(map, mapData);
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
    const map = this.mapService.createMap('map_canvas_station_board');

    this.mapLoadingPromise = new Promise<mapboxgl.Map>((resolve, reject) => {
      map.on('load', ev => {
        resolve(map);
        this.onMapLoad(map);
      });
    });
  }

  private onMapLoad(map: mapboxgl.Map) {
    this.mapService.addControls(map, this.debugXmlPopover, this.userTripService, this.languageService);

    this.addMapListeners(map);


    this.stopEventServiceRenderer = new StopEventServiceRenderer(map);
  }

  private updateMapForEntry(stopEvent: OJP_Legacy.StopEvent | null) {
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
      const nearbyFeatures = MapHelpers.queryNearbyFeaturesByLayerIDs(map, ev.lngLat, ['stops-circle', 'stops-label']);
      if (nearbyFeatures.length > 0) {
        const nearbyFeature = nearbyFeatures[0];
        this.stationBoardService.stationOnMapClicked.emit(nearbyFeature.feature);
      }
    });
  }
}
