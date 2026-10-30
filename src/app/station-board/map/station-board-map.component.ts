import { Component, OnInit } from '@angular/core';
import { SbbDialog } from '@sbb-esta/angular/dialog';

import mapgl from 'maplibre-gl'

import { MapService } from '../../shared/services/map.service';
import { UserTripService } from '../../shared/services/user-trip.service';
import { StationBoardService } from '../station-board.service';

import { StopEventServiceRenderer } from './stop-event-service-renderer/stop-event-service-renderer';
import { MapHelpers } from '../../map/helpers/map.helpers';
import { LanguageService } from '../../shared/services/language.service';
import { StopEventResult } from '../../shared/models/stop-event-result';

@Component({
  selector: 'station-board-map',
  templateUrl: './station-board-map.component.html',
  styleUrls: ['./station-board-map.component.scss']
})
export class StationBoardMapComponent implements OnInit {
  public mapLoadingPromise: Promise<mapgl.Map> | null;
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

    this.mapLoadingPromise = new Promise<mapgl.Map>((resolve, reject) => {
      map.on('load', ev => {
        resolve(map);
        this.onMapLoad(map);
      });
    });
  }

  private onMapLoad(map: mapgl.Map) {
    this.mapService.addControls(map, this.debugXmlPopover, this.userTripService, this.languageService);

    this.addMapListeners(map);

    this.mapService.addRasterLayers(map);

    this.stopEventServiceRenderer = new StopEventServiceRenderer(map);
  }

  private updateMapForEntry(stopEvent: StopEventResult | null) {
    if (stopEvent === null) {
      this.stopEventServiceRenderer?.resetStopEventLayers();
    } else {
      this.stopEventServiceRenderer?.drawStopEvent(stopEvent);
    }
  }

  private addMapListeners(map: mapgl.Map) {
    map.on('styleimagemissing', async ev => {
      const image_url = './assets/map-style-icons/' + ev.id + '.png';
      try {
        const image = await map.loadImage(image_url);
        if (!map.hasImage(ev.id)) {
          map.addImage(ev.id, image.data);
        }
      } catch (error) {
        console.error(error);
      }
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
