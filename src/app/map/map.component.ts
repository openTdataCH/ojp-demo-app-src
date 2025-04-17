import { Component, OnInit, AfterViewInit } from '@angular/core';
import { SbbDialog } from "@sbb-esta/angular/dialog";

import mapboxgl from 'mapbox-gl'

import * as OJP from 'ojp-sdk-v1';
import { MapService } from '../shared/services/map.service';
import { UserTripService } from '../shared/services/user-trip.service';

import { MapHelpers } from './helpers/map.helpers';

import { TripRenderController } from './controllers/trip-render-controller';
import { LanguageService } from '../shared/services/language.service';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit, AfterViewInit {
  public mapLoadingPromise: Promise<mapboxgl.Map> | null;

  private fromMarker: mapboxgl.Marker;
  private toMarker: mapboxgl.Marker;
  private viaMarkers: mapboxgl.Marker[]

  private popupContextMenu: mapboxgl.Popup

  private tripRenderController: TripRenderController | null

  constructor(
    private userTripService: UserTripService,
    private languageService: LanguageService,
    private mapService: MapService,
    private debugXmlPopover: SbbDialog,
  ) {
    // Dummy initialize the markers, re-init them in the loop below
    this.fromMarker = new mapboxgl.Marker();
    this.toMarker = new mapboxgl.Marker();

    const endpointTypes: OJP.JourneyPointType[] = ['From', 'To'];
    endpointTypes.forEach(endpointType => {
      var markerDIV = document.createElement('div');
      markerDIV.className = 'marker-journey-endpoint marker-journey-endpoint-' + endpointType;

      const marker = new mapboxgl.Marker({
        element: markerDIV,
        draggable: true,
        anchor: 'bottom'
      });

      marker.on('dragend', ev => {
        this.handleMarkerDrag(marker, endpointType);
      })

      if (endpointType === 'From') {
        this.fromMarker = marker
      }
      if (endpointType === 'To') {
        this.toMarker = marker
      }
    })

    this.viaMarkers = [];

    this.mapLoadingPromise = null;

    this.popupContextMenu = new mapboxgl.Popup({
      focusAfterOpen: false
    });

    this.tripRenderController = null;
  }

  ngOnInit() {
    this.userTripService.geoLocationsUpdated.subscribe(nothing => {
      this.updateMarkers()
    })

    this.userTripService.activeTripSelected.subscribe(mapTrip => {
      this.mapLoadingPromise?.then(map => {
        this.tripRenderController?.renderTrip(mapTrip?.legs ?? []);
      });
    })

    this.mapService.newMapBoundsRequested.subscribe(mapData => {
      this.mapLoadingPromise?.then(map => {
        this.mapService.zoomToBounds(map, mapData);
      });
    })

    this.mapService.newMapCenterAndZoomRequested.subscribe(mapData => {
      this.mapLoadingPromise?.then(map => {
        this.mapService.zoomToLocation(map, mapData);
      });
    });

    this.initMap()
  }

  ngAfterViewInit(): void {
    this.mapLoadingPromise?.then(map => {
      map.resize();
    });
  }

  private initMap() {
    const map = this.mapService.createMap('map_canvas');

    this.mapLoadingPromise = new Promise<mapboxgl.Map>((resolve, reject) => {
      map.on('load', ev => {
        resolve(map);
        this.onMapLoad(map);
      });
    });
  }

  private updateMarkers() {
    const endpointTypes: OJP.JourneyPointType[] = ['From', 'To']
    endpointTypes.forEach(endpointType => {
      const isFrom = endpointType === 'From'
      const tripLocationPoint = isFrom ? this.userTripService.fromTripLocation : this.userTripService.toTripLocation
      const marker = isFrom ? this.fromMarker : this.toMarker

      this.updateMarkerLocation(marker, tripLocationPoint?.location ?? null)
    });

    if (this.userTripService.isViaEnabled) {
      this.userTripService.viaTripLocations.forEach((viaTripLocation, markerIDx) => {
        let marker = this.viaMarkers[markerIDx] ?? null;
        if (marker === null) {
          marker = this.createViaMarker(viaTripLocation.location, markerIDx);
          this.viaMarkers.push(marker);
        }

        this.updateMarkerLocation(marker, viaTripLocation.location);
      });
    } else {
      this.viaMarkers.forEach(marker => {
        marker.remove();
      });

      this.viaMarkers = [];
    }
  }

  private handleMarkerDrag(marker: mapboxgl.Marker, endpointType: OJP.JourneyPointType) {
    const lngLat = marker.getLngLat();

    let location = OJP.Location.initWithLngLat(lngLat.lng, lngLat.lat);

    // Try to snap to the nearest stop
    this.userTripService.updateTripEndpoint(location, endpointType, 'MapDragend');
  }

  private onMapLoad(map: mapboxgl.Map) {
    this.mapService.addControls(map, this.debugXmlPopover, this.userTripService, this.languageService);

    map.on('contextmenu', (ev: mapboxgl.MapMouseEvent) => {
      this.showPickupPopup(map, ev.lngLat);
    });

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

    this.tripRenderController = new TripRenderController(map);
  }

  private showPickupPopup(map: mapboxgl.Map, lngLat: mapboxgl.LngLat) {
    let popupHTML = (document.getElementById('map-endpoint-coords-picker-popup') as HTMLElement).innerHTML;
    const pointLatLngS = MapHelpers.formatMapboxLngLatAsLatLng(lngLat);
    popupHTML = popupHTML.replace('[PICKER_COORDS]', pointLatLngS);

    const popupContainer = document.createElement('div');
    popupContainer.innerHTML = popupHTML;

    popupContainer.addEventListener('click', ev => {
      const btnEl = ev.target as HTMLButtonElement;
      const endpointType = btnEl.getAttribute('data-endpoint-type') as OJP.JourneyPointType;
      if (endpointType === null) {
        return;
      }

      const location = OJP.Location.initWithLngLat(lngLat.lng, lngLat.lat);
      this.userTripService.updateTripEndpoint(location, endpointType, 'MapPopupClick');

      this.popupContextMenu.remove();
    });

    this.popupContextMenu.setLngLat(lngLat)
      .setDOMContent(popupContainer)
      .addTo(map);
  }

  private updateMarkerLocation(marker: mapboxgl.Marker, location: OJP.Location | null) {
    const lnglat = location?.geoPosition?.asLngLat() ?? null;
    if (lnglat === null) {
      marker.remove();
      return;
    }

    const isNotOnMap = marker.getLngLat() === undefined;

    marker.setLngLat(lnglat);

    if (isNotOnMap) {
      this.mapLoadingPromise?.then(map => {
        marker.addTo(map);
      });
    }
  }

  private createViaMarker(location: OJP.Location, markerIDx: number): mapboxgl.Marker {
    const markerDIV = document.createElement('div');
    markerDIV.className = 'marker-journey-endpoint marker-journey-endpoint-Via';

    let isDraggable = false
    if (location.geoPosition?.properties === null) {
      // Only markers from coordinates-pickers are draggable
      isDraggable = true
    }

    const marker = new mapboxgl.Marker({
      element: markerDIV,
      anchor: 'bottom',
      draggable: isDraggable,
    });

    marker.on('dragend', ev => {
      const lngLat = marker.getLngLat();
      let location = OJP.Location.initWithLngLat(lngLat.lng, lngLat.lat);
      this.userTripService.updateViaPoint(location, markerIDx)
    })

    return marker
  }

}
