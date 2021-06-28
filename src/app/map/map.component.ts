import { Component, OnInit } from '@angular/core';
import mapboxgl from 'mapbox-gl'

import * as OJP from '../shared/ojp-sdk/index'
import { MapService } from '../shared/services/map.service';
import { UserSettingsService } from '../shared/services/user-settings.service';
import { UserTripService } from '../shared/services/user-trip.service';

import { MapHelpers } from './helpers/map.helpers';

import { MapAppLayer } from './app-layers/map-app-layer.interface';
import { StopsAppLayer } from './app-layers/stops/stops-app-layer';
import { AddressAppLayer } from './app-layers/address/address-app-layer';

import { MapDebugControl } from './controls/map-debug-control'
import { MapLayersLegendControl } from './controls/map-layers-legend-control';
import { TripRenderController } from './controllers/trip-render-controller';
import { ParkAndRailLayer } from './app-layers/poi-mocks/park-and-rail-layer/park-and-rail-layer';
import { BikeSharingStationsLayer } from './app-layers/poi-mocks/bike-sharing-layer/bike-sharing-stations-layer';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  public mapLoadingPromise: Promise<mapboxgl.Map> | null;

  private fromMarker: mapboxgl.Marker;
  private toMarker: mapboxgl.Marker;

  private mapAppLayers: MapAppLayer[]
  private stopsMapAppLayer: StopsAppLayer | null

  private prevMapBoundsHash: string = '';

  private popupContextMenu: mapboxgl.Popup

  private tripRenderController: TripRenderController | null

  constructor(
    private userTripService: UserTripService,
    private mapService: MapService,
    private userSettingsService: UserSettingsService
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

    this.mapAppLayers = []
    this.stopsMapAppLayer = null

    this.mapLoadingPromise = null;

    this.popupContextMenu = new mapboxgl.Popup({
      focusAfterOpen: false
    });

    this.tripRenderController = null
  }

  ngOnInit() {
    this.initMap()

    this.userTripService.locationUpdated.subscribe(locationData => {
      const location = locationData.location;

      let marker: mapboxgl.Marker | null = null

      if (locationData.endpointType === 'From') {
        marker = this.fromMarker
      }

      if (locationData.endpointType === 'To') {
        marker = this.toMarker
      }

      if (marker) {
        this.updateMarkerLocation(marker, location);
      }
    });

    this.mapService.centerAndZoomToEndpointRequested.subscribe(endpointType => {
      const marker = endpointType === 'From' ? this.fromMarker : this.toMarker;
      this.mapLoadingPromise?.then(map => {
        map.jumpTo({
          center: marker.getLngLat(),
          zoom: 16
        });
      });
    });

    this.userTripService.activeTripSelected.subscribe(trip => {
      this.mapLoadingPromise?.then(map => {
        this.tripRenderController?.renderTrip(trip)
      });
    })

    this.mapService.mapBoundsChanged.subscribe(newBounds => {
      this.mapLoadingPromise?.then(map => {
        map.fitBounds(newBounds, {
          padding: 100,
          duration: 0
        })
      });
    })

    this.mapService.mapCenterAndZoomChanged.subscribe(mapData => {
      this.mapLoadingPromise?.then(map => {
        map.jumpTo({
          center: mapData.lnglat,
          zoom: mapData.zoom
        });
      });
    })
  }

  private initMap() {
    const mapBounds = new mapboxgl.LngLatBounds([[5.9559,45.818], [10.4921,47.8084]]);

    const map = new mapboxgl.Map({
      container: 'map_canvas',
      style: 'mapbox://styles/mapbox/light-v10',
      bounds: mapBounds,
      accessToken: 'pk.eyJ1IjoidmFzaWxlIiwiYSI6ImNra2k2dWFkeDFrbG0ycXF0Nmg0Z2tsNXAifQ.nK-i-3cpWmji7HvK1Ilynw',
    });

    map.fitBounds(mapBounds, {
      padding: 50,
      duration: 0,
    });

    this.mapLoadingPromise = new Promise<mapboxgl.Map>((resolve, reject) => {
      map.on('load', ev => {
        resolve(map);
        this.onMapLoad(map);
      });
    });
  }

  private handleMarkerDrag(marker: mapboxgl.Marker, endpointType: OJP.JourneyPointType) {
    const lngLat = marker.getLngLat();

    let location = OJP.Location.initWithLngLat(lngLat.lng, lngLat.lat);

    // Try to snap to the nearest stop
    const nearbyStopFeature = this.stopsMapAppLayer?.queryNearbyFeature(lngLat) ?? null;
    if (nearbyStopFeature) {
      const nearbyLocation = OJP.Location.initWithFeature(nearbyStopFeature);
      if (nearbyLocation) {
        location = nearbyLocation
      }

      const nearbyStopLngLat = MapHelpers.computePointLngLatFromFeature(nearbyStopFeature)
      if (nearbyStopLngLat) {
        marker.setLngLat(nearbyStopLngLat);
      }
    }

    this.userTripService.updateTripEndpoint(location, endpointType, 'MapDragend');
  }

  private onMapLoad(map: mapboxgl.Map) {
    this.stopsMapAppLayer = new StopsAppLayer(map, this.userSettingsService, this.userTripService);
    const addressAppLayer = new AddressAppLayer(map, this.userSettingsService, this.userTripService)
    const parkAndRailLayer = new ParkAndRailLayer(map, this.userSettingsService, this.userTripService)
    const bikeSharingLayer = new BikeSharingStationsLayer(map, this.userSettingsService, this.userTripService)

    this.mapAppLayers = [this.stopsMapAppLayer, addressAppLayer, parkAndRailLayer, bikeSharingLayer]

    this.addMapControls(map);

    this.mapAppLayers.forEach(mapAppLayer => {
      mapAppLayer.addToMap();
    });

    map.on('idle', ev => {
      const currentMapBoundsHash = map.getBounds().toString();
      const hasSameBounds = this.prevMapBoundsHash === currentMapBoundsHash;
      if (hasSameBounds) {
        return;
      }
      this.prevMapBoundsHash = currentMapBoundsHash;

      this.mapAppLayers.forEach(mapAppLayer => {
        mapAppLayer.refreshFeatures();
      })
    });

    map.on('contextmenu', (ev: mapboxgl.MapMouseEvent) => {
      this.showPickupPopup(map, ev.lngLat);
    });

    map.on('click', (ev: mapboxgl.MapMouseEvent) => {
      let foundClickResponder = false;
      this.mapAppLayers.forEach(mapAppLayer => {
        if (foundClickResponder) {
          return
        }

        const layerHasClickResponder = mapAppLayer.onMapClick(ev)
        if (layerHasClickResponder) {
          foundClickResponder = true
        }
      })
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
        console.error('expected data-endpoint-type attribute');
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
    map.addControl(navigationControl);

    const scaleControl = new mapboxgl.ScaleControl({
        maxWidth: 200,
        unit: 'metric'
    });
    map.addControl(scaleControl);

    const debugControl = new MapDebugControl(map);
    map.addControl(debugControl, 'top-left');

    const mapLayersLegendControl = new MapLayersLegendControl(map, this.mapAppLayers);
    map.addControl(mapLayersLegendControl, 'bottom-right');
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

}
