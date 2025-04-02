import * as GeoJSON from 'geojson'

import * as OJP from 'ojp-sdk-v2';

import { AppMapLayer } from "../app-map-layer";

type LocationStatus = 'available' | 'occupied' | 'unknown'

export class ChargingStationAppMapLayer extends AppMapLayer {
  protected override annotateFeatureFromLocations(feature: GeoJSON.Feature, locations: OJP.Location[]): void {
    if (feature.properties === null) {
      return;
    }

    if (locations.length === 0) {
      return;
    }

    let itemsNo = 0;
    locations.forEach((location, idx) => {
      const locationStatus = this.computeLocationStatus(location);
      if (locationStatus === 'available') {
        itemsNo += 1;
      }
    });

    feature.properties['sharedVehicle.itemsNo'] = itemsNo;
  }

  private computeLocationStatus(location: OJP.Location): LocationStatus | null {
    const locationStatusAttr = location.attributes['locationStatus'] ?? null;
    if (locationStatusAttr === null) {
      return null;
    }

    const featureLocationStatus = locationStatusAttr.toUpperCase();
    if (featureLocationStatus === 'AVAILABALE') {
      return 'available'
    }

    if (featureLocationStatus === 'OCCUPIED') {
      return 'occupied'
    }

    if (featureLocationStatus === 'UNKNOWN') {
      return 'unknown'
    }

    return null;
  }

  protected override computePopupHTML(locations: OJP.Location[]): string | null {
    const popupWrapperDIV = document.getElementById('map-poi-picker-popup') as HTMLElement;
    if (popupWrapperDIV === null) {
      return null;
    }

    if (locations.length === 0) {
      return null;
    }

    const firstLocation = locations[0];
    if (firstLocation.poi === null) {
      return null;
    }

    // it could be that we get different POI category
    if (firstLocation.poi.category !== 'charging_station') {
      return null;
    }

    const tableTRs: string[] = [];
    tableTRs.push('<tr><td style="width:50px;">Name</td><td>' + firstLocation.poi.name + ' - ' + firstLocation.locationName + '</td></tr>');

    let codeCleaned = firstLocation.poi.code;
    codeCleaned = codeCleaned.replace(firstLocation.poi.name, '');
    codeCleaned = codeCleaned.replace((firstLocation.locationName ?? 'n/a'), '');
    tableTRs.push('<tr><td>Code</td><td>' + codeCleaned + '</td></tr>');

    const statusLIs: string[] = [];
    locations.forEach((location, idx) => {
      if (location.poi === null) {
        return;
      }

      const locationStatus = this.computeLocationStatus(location);
      if (locationStatus === null) {
        return;
      }

      const locationStatusText = (() => {
        let className = 'bg-success';
        if (locationStatus === 'occupied') {
          className = 'bg-danger';
        }
        if (locationStatus === 'unknown') {
          className = 'bg-secondary';
        }

        return '<span class="badge rounded-pill ' + className + '">' + locationStatus.toUpperCase() + '</span>';
      })();

      const locationCode = location.attributes['Code'] ?? null;

      const statusLI = '<li>' + locationStatusText + ' ' + locationCode + '</li>';
      statusLIs.push(statusLI);
    });

    tableTRs.push('<tr><td colspan="2"><p>Chargers (' + locations.length + ')</p><ul>' + statusLIs.join('') + '</ul></td></tr>');

    let popupHTML = popupWrapperDIV.innerHTML;
    popupHTML = popupHTML.replace('[POI_NAME]', 'Charging Station');

    const tableHTML = '<table class="table popup-charging-station">' + tableTRs.join('') + '</table>';
    popupHTML = popupHTML.replace('[GEOJSON_PROPERTIES_TABLE]', tableHTML);

    return popupHTML;
  }
}
