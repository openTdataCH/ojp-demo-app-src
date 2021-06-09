import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import mapboxgl from 'mapbox-gl'

import * as OJP from '../shared/ojp-sdk/index'

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  @Input() fromLocation: OJP.Location | null;
  @Input() toLocation: OJP.Location | null;

  public mapLoadingPromise: Promise<mapboxgl.Map> | null;

  private fromMarker: mapboxgl.Marker;
  private toMarker: mapboxgl.Marker;

  constructor() {
    this.fromLocation = null;
    this.toLocation = null;

    this.fromMarker = new mapboxgl.Marker();
    this.toMarker = new mapboxgl.Marker();

    this.mapLoadingPromise = null;
  }

  ngOnInit() {
    this.initMap()
  }

  ngOnChanges(changes: SimpleChanges) {
    for (let key in changes) {
      if (key === 'fromLocation') {
        this.updateMarkerLocation(this.fromMarker, this.fromLocation);
      }

      if (key === 'toLocation') {
        this.updateMarkerLocation(this.toMarker, this.toLocation);
      }
    }
  }

  private initMap() {
    const mapBounds = new mapboxgl.LngLatBounds([[5.9559,45.818], [10.4921,47.8084]]);

    const map = new mapboxgl.Map({
      container: 'map_canvas',
      style: 'mapbox://styles/mapbox/light-v10',
      bounds: mapBounds,
      accessToken: 'pk.eyJ1IjoidmFzaWxlIiwiYSI6ImNra2k2dWFkeDFrbG0ycXF0Nmg0Z2tsNXAifQ.nK-i-3cpWmji7HvK1Ilynw',
    });
    map.addControl(new mapboxgl.NavigationControl());

    map.fitBounds(mapBounds, {
      padding: 50,
      duration: 0,
    });

    this.mapLoadingPromise = new Promise<mapboxgl.Map>((resolve, reject) => {
      map.on('load', ev => {
        resolve(map);
      });
    });
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
