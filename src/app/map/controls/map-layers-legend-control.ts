import { SbbDialog } from "@sbb-esta/angular-business/dialog";

import mapboxgl from "mapbox-gl";
import { DebugXmlPopoverComponent } from "src/app/search-form/debug-xml-popover/debug-xml-popover.component";
import { LocationMapAppLayer } from "../app-layers/location-map-app-layer";
import { MapAppLayer } from "../app-layers/map-app-layer.interface";

interface LayerData {
  inputEl: HTMLInputElement | null
  textEl: HTMLSpanElement | null
  xmlInfoEl: HTMLSpanElement | null
  layer: MapAppLayer
}

export class MapLayersLegendControl implements mapboxgl.IControl {
  private map: mapboxgl.Map | null;
  private layersData: LayerData[]

  constructor(private debugXmlPopover: SbbDialog, map: mapboxgl.Map, mapAppLayers: MapAppLayer[]) {
    this.map = map;

    this.layersData = []
    mapAppLayers.forEach(mapAppLayer => {
      const layerData = <LayerData>{
        inputEl: null,
        textEl: null,
        xmlInfoEl: null,
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

    container.querySelectorAll('.map-layer-data').forEach(divEl => {
      const layerKey = divEl.getAttribute('data-map-layer-key');
      if (layerKey === null) {
        return
      }

      const inputEl = divEl.querySelector('.map-layer-checkbox') as HTMLInputElement
      const layerTextEl = divEl.querySelector('.layer-text') as HTMLElement

      if (inputEl === null || layerTextEl === null) {
        return
      }

      const layerData = this.layersData.find(layer => {
        return layer.layer.layerKey === layerKey;
      }) ?? null;
      if (layerData === null) {
        inputEl.disabled = true
        return
      }

      const layerXmlInfoEl = divEl.querySelector('.layer-xml-info') as HTMLInputElement

      inputEl.addEventListener('change', ev => {
        if (inputEl.checked) {
          layerData.layer.enable();
        } else {
          layerData.layer.disable();
        }
      });

      if (layerXmlInfoEl) {
        layerXmlInfoEl.addEventListener('click', ev => {
          const lastOJPRequest = ((layerData.layer as unknown) as LocationMapAppLayer).lastOJPRequest
          if (lastOJPRequest) {
            const dialogRef = this.debugXmlPopover.open(DebugXmlPopoverComponent, {
              width: '40rem',
              height: '40rem',
              position: { top: '10px' },
            });
            dialogRef.afterOpen().subscribe(() => {
              const popover = dialogRef.componentInstance as DebugXmlPopoverComponent
              popover.updateRequestData(lastOJPRequest.lastRequestData)
            });
          }
        })
      }

      layerData.layer.isEnabled = inputEl.checked
      layerData.inputEl = inputEl
      layerData.textEl = layerTextEl
      layerData.xmlInfoEl = layerXmlInfoEl
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
      const shouldDisableLayer = map.getZoom() < layerMinZoomLevel

      const inputEl = layerData.inputEl
      if (inputEl) {
        inputEl.disabled = shouldDisableLayer
      }
    });
  }
}
