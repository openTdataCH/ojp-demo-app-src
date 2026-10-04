import { Component, OnInit } from '@angular/core';
import { SbbDialog } from '@sbb-esta/angular/dialog';

import mapgl from 'maplibre-gl'

import { MapService } from '../../shared/services/map.service';
import { UserTripService } from '../../shared/services/user-trip.service';
import { TripInfoService } from '../trip-info.service';

import { StopEventServiceRenderer as JourneyServiceRenderer } from '../../station-board/map/stop-event-service-renderer/stop-event-service-renderer';
import { MapHelpers } from '../../map/helpers/map.helpers';
import { LanguageService } from '../../shared/services/language.service';
import { GeoPositionBBOX } from '../../shared/models/geo/geoposition-bbox';

@Component({
  selector: 'trip-info-map',
  templateUrl: './trip-info-map.component.html',
  styleUrls: ['./trip-info-map.component.scss']
})
export class TripInfoMapComponent implements OnInit {
  public mapLoadingPromise: Promise<mapgl.Map> | null;
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
          this.journeyServiceRenderer?.drawTripInfoResult(tripInfoResult);
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
    
    this.mapLoadingPromise = new Promise<mapgl.Map>((resolve, reject) => {
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

    const bbox = GeoPositionBBOX.initFromGeoJSONFeatures(geojsonFeatures);
    if (!bbox.isValid()) {
      console.error('Invalid BBOX for features');
      console.log(geojsonFeatures);
      return;
    }

    const bounds = new mapgl.LngLatBounds(bbox.asFeatureBBOX());
    const mapData = {
      bounds: bounds,
    }
    this.mapService.newMapBoundsRequested.emit(mapData);
  }

  private onMapLoad(map: mapgl.Map) {
    this.mapService.addControls(map, this.debugXmlPopover, this.userTripService, this.languageService);

    this.addMapListeners(map);

    this.mapService.addRasterLayers(map);

    this.journeyServiceRenderer = new JourneyServiceRenderer(map);
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
        
        console.log(nearbyFeature);
      }
    });
  }
}
