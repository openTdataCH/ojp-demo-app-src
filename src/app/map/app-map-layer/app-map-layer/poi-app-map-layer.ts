import * as GeoJSON from 'geojson'

import { AppMapLayer } from "../app-map-layer";

import { AnyPlace } from '../../../shared/models/place/place-builder';
import { Poi } from '../../../shared/models/place/poi';

export class POIAppMapLayer extends AppMapLayer {
  protected override annotateFeatureFromLocations(feature: GeoJSON.Feature, places: AnyPlace[]): void {
    if (feature.properties === null) {
      return;
    }

    if (places.length === 0 || places[0].type !== 'poi') {
      return;
    }

    const poi = places[0] as Poi;

    feature.properties['style.icon-image'] = poi.computePoiMapIcon();
  }

  protected override computePopupHTML(places: AnyPlace[]): string | null {
    if (places.length === 0) {
      return null;
    }

    const firstPlace = places[0];
    if (firstPlace.type !== 'poi') {
      return null;
    }

    const poi = firstPlace as Poi;

    const poiCategory = poi.category;
    const poiSubCategory = poi.subCategory ?? '';

    const popupWrapperDIV = document.getElementById('map-poi-picker-popup') as HTMLElement;
    if (popupWrapperDIV === null) {
      return null;
    }

    let popupHTML = popupWrapperDIV.innerHTML;
    popupHTML = popupHTML.replace('[POI_NAME]', poi.name);

    const tableTRs: string[] = []
    tableTRs.push('<tr><td>Code</td><td>' + poi.publicCode.substring(0, 20) + '...</td></tr>');
    tableTRs.push('<tr><td>Category</td><td>' + poiCategory + '</td></tr>');
    tableTRs.push('<tr><td>SubCategory</td><td>' + poiSubCategory + '</td></tr>');

    const tableHTML = '<table class="table">' + tableTRs.join('') + '</table>';
    popupHTML = popupHTML.replace('[GEOJSON_PROPERTIES_TABLE]', tableHTML);

    return popupHTML;
  }
}
