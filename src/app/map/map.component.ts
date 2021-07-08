import { Component, OnInit } from '@angular/core';
import mapboxgl from 'mapbox-gl'

import * as OJP from '../shared/ojp-sdk/index'
import { MapService } from '../shared/services/map.service';
import { UserTripService } from '../shared/services/user-trip.service';

import { MapHelpers } from './helpers/map.helpers';

import { MapAppLayer } from './app-layers/map-app-layer.interface';
import { StopsAppLayer } from './app-layers/stops/stops-app-layer';
import { AddressAppLayer } from './app-layers/address/address-app-layer';
import { PoiBicycleRentalLayer } from './app-layers/poi/bicycle-rental/poi-bicycle-rental-layer';
import { PoiParkRideLayer } from './app-layers/poi/park-ride/poi-park-ride-layer';


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

  private mapAppLayers: MapAppLayer[]
  private stopsMapAppLayer: StopsAppLayer | null

  private prevMapBoundsHash: string = '';

  private popupContextMenu: mapboxgl.Popup

  private tripRenderController: TripRenderController | null

  constructor(
    private userTripService: UserTripService,
    private mapService: MapService
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

    this.userTripService.locationsUpdated.subscribe(nothing => {
      this.updateMarkers()
    })

    this.userTripService.activeTripSelected.subscribe(trip => {
      this.mapLoadingPromise?.then(map => {
        this.tripRenderController?.renderTrip(trip)
      });
    })

    this.mapService.newMapBoundsRequested.subscribe(mapData => {
      this.mapLoadingPromise?.then(map => {
        const newBounds = mapData.bounds
        const padding = mapData.padding ?? 100
        const onlyIfOutside = mapData.onlyIfOutside ?? false

        if (onlyIfOutside) {
          const isInside = MapHelpers.areBoundsInsideOtherBounds(newBounds, map.getBounds())
          if (isInside) {
            return
          }
        }

        map.fitBounds(newBounds, {
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

  private updateMarkers() {
    const endpointTypes: OJP.JourneyPointType[] = ['From', 'To']
    endpointTypes.forEach(endpointType => {
      const isFrom = endpointType === 'From'
      const location = isFrom ? this.userTripService.fromLocation : this.userTripService.toLocation
      const marker = isFrom ? this.fromMarker : this.toMarker

      this.updateMarkerLocation(marker, location)
    })

    const viaMakersCount = this.viaMarkers.length
    const viaLocationsCount = this.userTripService.viaLocations.length

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
    this.userTripService.viaLocations.forEach((viaLocation, idx) => {
      let marker = this.viaMarkers[idx] ?? null
      if (marker === null) {
        marker = this.createViaMarker(viaLocation)
        this.viaMarkers.push(marker)
      }

      this.updateMarkerLocation(marker, viaLocation)
    })
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
    this.stopsMapAppLayer = new StopsAppLayer(map, this.userTripService);
    const addressAppLayer = new AddressAppLayer(map, this.userTripService)
    const parkAndRideLayer = new PoiParkRideLayer(map, this.userTripService)
    const bikeSharingLayer = new PoiBicycleRentalLayer(map, this.userTripService)

    this.mapAppLayers = [this.stopsMapAppLayer, addressAppLayer, parkAndRideLayer, bikeSharingLayer]

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
