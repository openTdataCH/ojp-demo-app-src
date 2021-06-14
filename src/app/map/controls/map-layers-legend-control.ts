import mapboxgl from "mapbox-gl";
import { MapAppLayer } from "../app-layers/map-app-layer.interface";

interface LayerData {
  inputEl: HTMLInputElement | null
  layer: MapAppLayer
}

export class MapLayersLegendControl implements mapboxgl.IControl {
  private map: mapboxgl.Map | null;
  private layersData: LayerData[]

  constructor(map: mapboxgl.Map, mapAppLayers: MapAppLayer[]) {
    this.map = map;

    this.layersData = []
    mapAppLayers.forEach(mapAppLayer => {
      const layerData = <LayerData>{
        inputEl: null,
        layer: mapAppLayer
      }
      this.layersData.push(layerData);
    })

    this.map.on('zoom', ev => {
      this.onZoomChanged(map);
    })
  }

  onAdd(map: mapboxgl.Map): HTMLElement {
    this.map = map;

    const container = document.createElement('div');
    container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group map-control';

    container.innerHTML = (document.getElementById('map-layers-legend-control') as HTMLElement).innerHTML;

    const inputElements = Array.from(container.getElementsByTagName('input')) as HTMLInputElement[];
    inputElements.forEach(inputEl => {
      const layerKey = inputEl.getAttribute('data-map-layer-key')
      if (layerKey === null) {
        return
      }

      const layerData = this.layersData.find(layer => {
        return layer.layer.layerKey === layerKey;
      }) ??  null;
      if (layerData === null) {
        inputEl.disabled = true
        return
      }

      inputEl.addEventListener('change', ev => {
        if (inputEl.checked) {
          layerData.layer.enable();
        } else {
          layerData.layer.disable();
        }
      });

      layerData.layer.isEnabled = inputEl.checked

      layerData.inputEl = inputEl
    });

    this.onZoomChanged(map);

    return container;
  }

  onRemove() {
    this.map = null;
  }

  private onZoomChanged(map: mapboxgl.Map) {
    this.layersData.forEach(layerData => {
      const layerMinZoomLevel = layerData.layer.minZoomLevel
      const inputEl = layerData.inputEl
      if (inputEl === null) {
        return
      }

      inputEl.disabled = map.getZoom() < layerMinZoomLevel
    });
  }
}
