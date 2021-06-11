import { Component, OnInit } from '@angular/core';
import mapboxgl from 'mapbox-gl'

import * as OJP from '../shared/ojp-sdk/index'
import { MapService } from '../shared/services/map.service';
import { UserTripService } from '../shared/services/user-trip.service';

import { MapDebugControl } from './controls/map-debug-control'

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  public mapLoadingPromise: Promise<mapboxgl.Map> | null;

  private fromMarker: mapboxgl.Marker;
  private toMarker: mapboxgl.Marker;

  constructor(private userTripService: UserTripService, private mapService: MapService) {
    this.fromMarker = new mapboxgl.Marker();
    this.toMarker = new mapboxgl.Marker();

    const endpointTypes: OJP.JourneyPointType[] = ['From', 'To'];
    endpointTypes.forEach(pointType => {
      const marker = pointType === 'From' ? this.fromMarker : this.toMarker;

      marker.setDraggable(true);
      marker.on('dragend', ev => {
        const lnglat = marker.getLngLat();
        const location = OJP.Location.initWithLngLat(lnglat.lng, lnglat.lat);
        this.userTripService.updateTripEndpoint(location, pointType, 'MapDragend');
      })
    })

    this.mapLoadingPromise = null;
  }

  ngOnInit() {
    this.initMap()

    this.userTripService.locationUpdated.subscribe(locationData => {
      if (locationData.updateSource === 'SearchForm') {
        const location = locationData.location;
        const marker = locationData.endpointType === 'From' ? this.fromMarker : this.toMarker;
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

        this.addMapControls(map);
      });
    });
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
  }

  private mapBoundsChanged(map: mapboxgl.Map) {
    console.log(map.getBounds().toString());
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
