import { Component, OnInit } from '@angular/core';
import { SbbDialog } from "@sbb-esta/angular/dialog";

import mapboxgl from 'mapbox-gl'

import * as OJP from 'ojp-sdk'
import { MapService } from '../shared/services/map.service';
import { UserTripService } from '../shared/services/user-trip.service';

import { MapHelpers } from './helpers/map.helpers';

import { MapDebugControl } from './controls/map-debug-control'
import { MapLayersLegendControl } from './controls/map-layers-legend-control';
import { TripRenderController } from './controllers/trip-render-controller';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  public mapLoadingPromise: Promise<mapboxgl.Map> | null;

  private fromMarker: mapboxgl.Marker;
  private toMarker: mapboxgl.Marker;
  private viaMarkers: mapboxgl.Marker[]

  private popupContextMenu: mapboxgl.Popup

  private tripRenderController: TripRenderController | null

  constructor(
    private userTripService: UserTripService,
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

    this.viaMarkers = []

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

    this.userTripService.activeTripSelected.subscribe(trip => {
      this.mapLoadingPromise?.then(map => {
        this.tripRenderController?.renderTrip(trip)
      });
    })

    this.mapService.newMapBoundsRequested.subscribe(mapData => {
      this.mapLoadingPromise?.then(map => {
        const newBounds = mapData.bounds;
        const padding = mapData.padding ?? 100
        const onlyIfOutside = mapData.onlyIfOutside ?? false

        if (onlyIfOutside) {
          const isInside = MapHelpers.areBoundsInsideOtherBounds(newBounds, map.getBounds())
          if (isInside) {
            return
          }
        }

        // TODO - check wht Mapbox is complaining
        // map.fitBounds(newBounds, {
        //   padding: padding,
        //   duration: 0
        // })

        // without this hack we get
        // ERROR Error: Uncaught (in promise): Error: `LngLatLike` argument must be specified as a LngLat instance, an object {lng: <lng>, lat: <lat>}, an object {lon: <lng>, lat: <lat>}, or an array of [<lng>, <lat>]
        // Error: `LngLatLike` argument must be specified as a LngLat instance, an object {lng: <lng>, lat: <lat>}, an object {lon: <lng>, lat: <lat>}, or an array of [<lng>, <lat>]
        const fixedBounds: mapboxgl.LngLatBoundsLike = [newBounds.getWest(), newBounds.getSouth(), newBounds.getEast(), newBounds.getNorth()];
        map.fitBounds(fixedBounds, {
          padding: padding,
          duration: 0
        })
      });
    })

    this.mapService.newMapCenterAndZoomRequested.subscribe(mapData => {
      this.mapLoadingPromise?.then(map => {
        map.jumpTo({
          center: mapData.lnglat,
          zoom: mapData.zoom
        });
      });
    })

    this.userTripService.viaAtIndexRemoved.subscribe(viaIdx => {
      if (viaIdx > (this.viaMarkers.length - 1)) {
        return
      }

      const marker = this.viaMarkers[viaIdx]
      marker.remove()

      this.viaMarkers.splice(viaIdx, 1)
    })

    this.initMap()
  }

  private initMap() {
    const mapBounds = new mapboxgl.LngLatBounds([[5.9559,45.818], [10.4921,47.8084]]);

    const map = new mapboxgl.Map({
      container: 'map_canvas',
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

  private updateMarkers() {
    const endpointTypes: OJP.JourneyPointType[] = ['From', 'To']
    endpointTypes.forEach(endpointType => {
      const isFrom = endpointType === 'From'
      const tripLocationPoint = isFrom ? this.userTripService.fromTripLocation : this.userTripService.toTripLocation
      const marker = isFrom ? this.fromMarker : this.toMarker

      this.updateMarkerLocation(marker, tripLocationPoint?.location ?? null)
    })

    const viaMakersCount = this.viaMarkers.length
    const viaLocationsCount = this.userTripService.viaTripLocations.length

    // Remove excess VIA markers
    if (viaMakersCount > viaLocationsCount) {
      let markersToRemove: mapboxgl.Marker[] = this.viaMarkers
      if (viaLocationsCount > 0) {
        const markersCountToRemove = viaMakersCount - viaLocationsCount
        markersToRemove = this.viaMarkers.splice(viaLocationsCount, markersCountToRemove)
      }

      markersToRemove.forEach(marker => {
        marker.remove()
      })
    }

    // Adds / Update VIA markers
    this.userTripService.viaTripLocations.forEach((viaTripLocation, idx) => {
      let marker = this.viaMarkers[idx] ?? null
      if (marker === null) {
        marker = this.createViaMarker(viaTripLocation.location)
        this.viaMarkers.push(marker)
      }

      this.updateMarkerLocation(marker, viaTripLocation.location)
    })
  }

  private handleMarkerDrag(marker: mapboxgl.Marker, endpointType: OJP.JourneyPointType) {
    const lngLat = marker.getLngLat();

    let location = OJP.Location.initWithLngLat(lngLat.lng, lngLat.lat);

    // Try to snap to the nearest stop

    this.userTripService.updateTripEndpoint(location, endpointType, 'MapDragend');
  }

  private onMapLoad(map: mapboxgl.Map) {
    this.addMapControls(map);

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

  private createViaMarker(location: OJP.Location): mapboxgl.Marker {
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

    const markerIDx = this.viaMarkers.length

    marker.on('dragend', ev => {
      const lngLat = marker.getLngLat();
      let location = OJP.Location.initWithLngLat(lngLat.lng, lngLat.lat);
      this.userTripService.updateViaPoint(location, markerIDx)
    })

    return marker
  }

}
