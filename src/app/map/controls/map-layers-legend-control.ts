import { SbbDialog } from "@sbb-esta/angular-business/dialog";

import mapboxgl from "mapbox-gl";
import { APP_CONFIG } from "src/app/config/app-config";
import { DebugXmlPopoverComponent } from "src/app/search-form/debug-xml-popover/debug-xml-popover.component";
import { UserTripService } from "src/app/shared/services/user-trip.service";
import { AppMapLayer } from "../app-map-layer/app-map-layer";

interface LayerData {
  inputEl: HTMLInputElement | null
  textEl: HTMLSpanElement | null
  xmlInfoEl: HTMLSpanElement | null
  layer: AppMapLayer
}

export class MapLayersLegendControl implements mapboxgl.IControl {
  private map: mapboxgl.Map | null;
  private layersData: LayerData[]
  private userTripService: UserTripService

  private prevMapBoundsHash: string = '';

  constructor(map: mapboxgl.Map, private debugXmlPopover: SbbDialog, userTripService: UserTripService) {
    this.map = map;
    this.layersData = []
    this.userTripService = userTripService;
  }

  onAdd(map: mapboxgl.Map): HTMLElement {
    this.map = map;

    const container = document.createElement('div');
    container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group map-control';
    container.innerHTML = (document.getElementById('map-layers-legend-control') as HTMLElement).innerHTML;

    this.addLayers(container, map);

    map.on('zoom', ev => {
      this.onZoomChanged(map);
    });
    this.onZoomChanged(map);

    map.on('idle', ev => {
      this.handleMapIdleEvents(map);
    })

    map.on('click', ev => {
      this.handleMapClickEvents(ev, map);
    })

    return container;
  }

  onRemove() {
    this.map = null;
  }

  private addLayers(container: HTMLElement, map: mapboxgl.Map) {
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

      const layerXmlInfoEl = divEl.querySelector('.layer-xml-info') as HTMLInputElement

      const appMapLayerOptions = APP_CONFIG.map_app_map_layers[layerKey] ?? null;
      if (appMapLayerOptions === null) {
        console.error('ERROR - MapLayersLegendControl - cant find layerKey ' + layerKey + ' in APP_CONFIG');
        inputEl.disabled = true;

        const errorBlockHTML = '<span class="badge bg-danger text-white">ERROR</span>';
        divEl.insertAdjacentHTML('beforeend', errorBlockHTML);

        if (layerXmlInfoEl) {
          layerXmlInfoEl.classList.add('d-none');
        }
        
        return;
      }

      const appMapLayer = new AppMapLayer(layerKey, map, appMapLayerOptions, this.userTripService);
      appMapLayer.isEnabled = inputEl.checked;

      if (layerXmlInfoEl) {
        layerXmlInfoEl.addEventListener('click', ev => {
          const lastOJPRequest = appMapLayer.lastOJPRequest
          if (lastOJPRequest) {
            const dialogRef = this.debugXmlPopover.open(DebugXmlPopoverComponent, {
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

      inputEl.addEventListener('change', ev => {
        appMapLayer.isEnabled = inputEl.checked;
        
        if (inputEl.checked) {
          appMapLayer.refreshFeatures();
        } else {
          appMapLayer.removeAllFeatures();
        }
      });

      const layerData = <LayerData>{
        inputEl: inputEl,
        textEl: layerTextEl,
        xmlInfoEl: layerXmlInfoEl,
        layer: appMapLayer,
      };
      this.layersData.push(layerData);
    });
  }

  private handleMapIdleEvents(map: mapboxgl.Map) {
    const currentMapBoundsHash = map.getBounds().toString();
    const hasSameBounds = this.prevMapBoundsHash === currentMapBoundsHash;
    if (hasSameBounds) {
      return;
    }
    this.prevMapBoundsHash = currentMapBoundsHash;

    this.layersData.forEach(layerData => {
      layerData.layer.refreshFeatures();
    });
  }

  private onZoomChanged(map: mapboxgl.Map) {
    this.layersData.forEach(layerData => {
      const layerMinZoomLevel = layerData.layer.minZoom;
      const shouldDisableLayer = map.getZoom() < layerMinZoomLevel;

      const inputEl = layerData.inputEl
      if (inputEl) {
        inputEl.disabled = shouldDisableLayer
      }
    });
  }

  private handleMapClickEvents(ev: mapboxgl.MapMouseEvent, map: mapboxgl.Map) {
    let foundClickResponder = false;
    this.layersData.forEach(layerData => {
      if (foundClickResponder) {
        return;
      }

      const layerHasClickResponder = layerData.layer.handleMapClick(ev);
      if (layerHasClickResponder) {
        foundClickResponder = true
      }
    })
  }
}
