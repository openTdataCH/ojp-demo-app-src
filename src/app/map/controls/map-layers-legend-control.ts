import { SbbDialog } from "@sbb-esta/angular/dialog";

import mapboxgl from "mapbox-gl";

import { UserTripService } from "../../shared/services/user-trip.service";
import { LanguageService } from "../../shared/services/language.service";

import { DebugXmlPopoverComponent } from "../../search-form/debug-xml-popover/debug-xml-popover.component";
import { AppMapLayer } from "../app-map-layer/app-map-layer";
import { AppMapLayerFactory } from "../app-map-layer/app-map-layer/app-map-layer-factory";

import { AppMapLayerOptions, MAP_APP_MAP_LAYERS } from "../../config/constants";
import { RestrictionPoiOSMTag } from "../../shared/models/place/poi";

interface LayerData {
  inputEls: HTMLInputElement[] | null
  xmlInfoEl: HTMLSpanElement | null
  layer: AppMapLayer
}

export class MapLayersLegendControl implements mapboxgl.IControl {
  private map: mapboxgl.Map | null;
  private layersData: LayerData[]
  private userTripService: UserTripService
  private languageService: LanguageService

  // TODO - move me in MapLayersController
  private prevMapBoundsHash: string = '';

  constructor(map: mapboxgl.Map, private debugXmlPopover: SbbDialog, userTripService: UserTripService, languageService: LanguageService) {
    this.map = map;
    this.layersData = []
    this.userTripService = userTripService;
    this.languageService = languageService;
  }

  onAdd(map: mapboxgl.Map): HTMLElement {
    this.map = map;

    const container = document.createElement('div');
    container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group map-control';
    container.innerHTML = (document.getElementById('map-layers-legend-control') as HTMLElement).innerHTML;

    this.addLayers(container, map);
    this.addPOICompositeLayers(container, map);

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

      if (inputEl === null) {
        return
      }

      const layerXmlInfoEl = divEl.querySelector('.layer-xml-info') as HTMLInputElement

      const appMapLayerOptions = MAP_APP_MAP_LAYERS[layerKey] ?? null;
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

      const appMapLayer = AppMapLayerFactory.init(this.languageService.language, layerKey, map, appMapLayerOptions, this.userTripService);
      appMapLayer.isEnabled = inputEl.checked;

      if (layerXmlInfoEl) {
        this.addLayerInfoClickHandler(layerXmlInfoEl, appMapLayer);
      }

      inputEl.addEventListener('change', ev => {
        appMapLayer.isEnabled = inputEl.checked;
        
        if (inputEl.checked) {
          appMapLayer.refreshFeatures();
        } else {
          appMapLayer.removeAllFeatures();
        }
      });

      const layerData: LayerData = {
        inputEls: [inputEl],
        xmlInfoEl: layerXmlInfoEl,
        layer: appMapLayer,
      };
      this.layersData.push(layerData);
    });
  }

  private addLayerInfoClickHandler(el: HTMLElement, appMapLayer: AppMapLayer) {
    el.addEventListener('click', ev => {
      const lastOJPRequest = appMapLayer.lastOJPRequest
      if (lastOJPRequest) {
        const dialogRef = this.debugXmlPopover.open(DebugXmlPopoverComponent, {
          position: { top: '20px' },
          width: '50vw',
          height: '90vh',
        });
        dialogRef.afterOpened().subscribe(() => {
          const popover = dialogRef.componentInstance as DebugXmlPopoverComponent
          popover.updateRequestData(lastOJPRequest.requestInfo);
        });
      }
    })
  }

  private addPOICompositeLayers(container: HTMLElement, map: mapboxgl.Map) {
    container.querySelectorAll('.map-composite-pois').forEach(el => {
      const wrapperEl = el as HTMLElement;
      this.addPOICompositeLayer(wrapperEl, map);
    });
  }

  private addPOICompositeLayer(wrapperEl: HTMLElement, map: mapboxgl.Map) {
    const layerKey = 'pois-ALL';
    const appMapLayerOptions: AppMapLayerOptions = JSON.parse(JSON.stringify(MAP_APP_MAP_LAYERS[layerKey]));

    const poiOSMTags: RestrictionPoiOSMTag[] = [];
    const inputEls: HTMLInputElement[] = [];
    wrapperEl.querySelectorAll('.map-layer-poi').forEach(el => {
      const inputEl = el as HTMLInputElement;
      
      const poiOSMTag = inputEl.getAttribute('data-osm-tag') as RestrictionPoiOSMTag;
      if (poiOSMTag === null) {
        return;
      }

      inputEls.push(inputEl);

      if (inputEl.checked) {
        poiOSMTags.push(poiOSMTag);
      }

      inputEl.addEventListener('change', ev => {
        const poiOSMTags: RestrictionPoiOSMTag[] = [];
        inputEls.forEach(inputEl => {
          const poiOSMTag = inputEl.getAttribute('data-osm-tag') as RestrictionPoiOSMTag;
          if (inputEl.checked && poiOSMTag) {
            poiOSMTags.push(poiOSMTag);
          }
        });

        if (appMapLayer.restrictionPOI) {
          appMapLayer.restrictionPOI.tags = poiOSMTags
        }
        appMapLayer.isEnabled = poiOSMTags.length > 0;
        appMapLayer.refreshFeatures();

        if (layerData.xmlInfoEl) {
          if (appMapLayer.isEnabled)  {
            layerData.xmlInfoEl.classList.remove('d-none');
          } else {
            layerData.xmlInfoEl.classList.add('d-none');
          }
        }
      });
    });

    appMapLayerOptions.LIR_POI_Type = {
      poiType: 'poi',
      tags: poiOSMTags,
    }
    const appMapLayer = AppMapLayerFactory.init(this.languageService.language, layerKey, map, appMapLayerOptions, this.userTripService);
    appMapLayer.isEnabled = poiOSMTags.length > 0;

    const layerXmlInfoEl = wrapperEl.querySelector('.layer-xml-info') as HTMLInputElement;
    this.addLayerInfoClickHandler(layerXmlInfoEl, appMapLayer);

    const layerData: LayerData = {
      layer: appMapLayer,
      inputEls: inputEls,
      xmlInfoEl: layerXmlInfoEl,
    };
    this.layersData.push(layerData);
  }

  private handleMapIdleEvents(map: mapboxgl.Map) {
    const mapBounds = map.getBounds();
    if (mapBounds === null) {
      return;
    }

    const currentMapBoundsHash = mapBounds.toString();
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

      layerData.inputEls?.forEach(inputEl => {
        inputEl.disabled = shouldDisableLayer
      })

      if (layerData.xmlInfoEl) {
        if (shouldDisableLayer) {
          layerData.xmlInfoEl.classList.add('d-none');
        } else {
          layerData.xmlInfoEl.classList.remove('d-none');
        }
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
