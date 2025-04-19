import * as GeoJSON from 'geojson'

import * as OJP_Legacy from 'ojp-sdk-v1';

import { AppMapLayer } from "../app-map-layer";

export class POIAppMapLayer extends AppMapLayer {
  protected override annotateFeatureFromLocations(feature: GeoJSON.Feature, locations: OJP_Legacy.Location[]): void {
    if (feature.properties === null) {
      return;
    }

    if (locations.length === 0 || locations[0].poi === null) {
      return;
    }

    feature.properties['style.icon-image'] = locations[0].poi.computePoiMapIcon();
  }

  protected override computePopupHTML(locations: OJP_Legacy.Location[]): string | null {
    if (locations.length === 0) {
      return null;
    }

    const location = locations[0];
    if (location.poi === null) {
      return null;
    }

    const popupWrapperDIV = document.getElementById('map-poi-picker-popup') as HTMLElement;
    if (popupWrapperDIV === null) {
      return null;
    }

    let popupHTML = popupWrapperDIV.innerHTML;
    popupHTML = popupHTML.replace('[POI_NAME]', location.poi.name);

    const tableTRs: string[] = []
    tableTRs.push('<tr><td>Code</td><td>' + location.poi.code.substring(0, 20) + '...</td></tr>');
    tableTRs.push('<tr><td>Category</td><td>' + location.poi.category + '</td></tr>');
    tableTRs.push('<tr><td>SubCategory</td><td>' + location.poi.subCategory + '</td></tr>');

    const tableHTML = '<table class="table">' + tableTRs.join('') + '</table>';
    popupHTML = popupHTML.replace('[GEOJSON_PROPERTIES_TABLE]', tableHTML);

    return popupHTML;
  }
}
