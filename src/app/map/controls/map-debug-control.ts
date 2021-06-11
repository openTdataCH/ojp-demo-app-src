import mapboxgl from "mapbox-gl";

export class MapDebugControl implements mapboxgl.IControl {
  private map: mapboxgl.Map | null;
  private container?: HTMLElement | null;

  private debugCenterEl?: HTMLElement | null;
  private debugZoomEl?: HTMLElement | null;

  constructor(map: mapboxgl.Map) {
    this.map = map;
    this.container = null;

    this.debugCenterEl = null;
    this.debugZoomEl = null;
  }

  onAdd(map: mapboxgl.Map): HTMLElement {
    this.map = map;

    this.container = document.createElement('div');
    this.container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group map-control';

    this.container.innerHTML = '<div><span class="fw-bold">Center</span>: <span id="map_debug_center">n/a</span></ div><div><span class="fw-bold">Zoom</span>: <span id="map_debug_zoom">n/a</span></div>';

    map.on('move', () => {
      this.updateDebugCenter();
    });

    map.on('zoom', () => {
      this.updateDebugZoom();
    });

    setTimeout(() => {
      this.debugCenterEl = document.getElementById('map_debug_center');
      this.debugZoomEl = document.getElementById('map_debug_zoom');

      this.updateDebugZoom();
      this.updateDebugCenter();
    }, 200);

    return this.container;
  }

  onRemove() {
    this.map = null;
    this.container = null;
  }

  private updateDebugZoom() {
    if (!(this.map && this.debugZoomEl)) {
      return;
    }

    this.debugZoomEl!.innerText = this.map!.getZoom().toFixed(2).toString();
  }

  private updateDebugCenter() {
    if (!(this.map && this.debugCenterEl)) {
      return;
    }

    const coordsArray = this.map!.getCenter().toArray().map((coord) => {
      return coord.toFixed(6);
    });
    this.debugCenterEl!.innerText = coordsArray.join(',');
  }
}
