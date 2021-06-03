import { Component, OnInit } from '@angular/core';
import mapboxgl from 'mapbox-gl'

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {

  constructor() { }

  ngOnInit() {
    this.initMap()
  }

  onLocationSelected(ev: any, originType: string) {
    console.log(originType);
    console.log(ev);
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
  }

}
