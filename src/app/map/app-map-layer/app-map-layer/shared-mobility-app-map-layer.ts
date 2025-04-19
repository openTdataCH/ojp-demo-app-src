import * as GeoJSON from 'geojson'

import OJP_Legacy from '../../../config/ojp-legacy';

import { AppMapLayer } from "../app-map-layer";
import { SharedMobility } from './shared-mobility/shared-mobility';

export class SharedMobilityAppMapLayer extends AppMapLayer {
  protected override annotateFeatureFromLocations(feature: GeoJSON.Feature, locations: OJP_Legacy.Location[]): void {
    if (feature.properties === null) {
      return;
    }

    if (locations.length === 0) {
      return;
    }

    let itemsNo: number | null = null;
    locations.forEach(location => {
      const vehicle = SharedMobility.initFromLocation(location);
      if (vehicle === null) {
        return;
      }

      if (vehicle.vehiclesNo !== null) {
        if (itemsNo === null) {
          itemsNo = 0;
        }

        itemsNo += vehicle.vehiclesNo;
      }
    });

    if (itemsNo !== null) {
      feature.properties['sharedVehicle.itemsNo'] = itemsNo;
    }

    const vehicle = SharedMobility.initFromLocation(locations[0]);
    if (vehicle) {
      feature.properties['sharedVehicle.provider'] = vehicle.computeProviderLabel();
    }
  }

  protected override computePopupHTML(locations: OJP_Legacy.Location[]): string | null {
    if (locations.length === 0) {
      return null;
    }

    const popupWrapperDIV = document.getElementById('map-poi-picker-popup') as HTMLElement;
    if (popupWrapperDIV === null) {
      return null;
    }

    let popupHTML = popupWrapperDIV.innerHTML;

    const vehicles: SharedMobility[] = [];
    locations.forEach(location => {
      const vehicle = SharedMobility.initFromLocation(location);
      if (vehicle) {
        vehicles.push(vehicle);
      }
    });

    if (vehicles.length === 0) {
      const firstLocation = locations[0];

      popupHTML = popupHTML.replace('[POI_NAME]', 'GENERIC SHARED MOBILITY');

      const tableTRs: string[] = []
      for (let key in firstLocation.attributes) {
        let value = firstLocation.attributes[key];
        if (typeof value === 'string') {
          const valueS = new String(value)
          if (valueS.startsWith('http')) {
            value = '<a href="' + valueS + '" target="_blank">' + valueS + '</a>';
          }
        }

        const tableTR = '<tr><td>' + key + '</td><td>' + value + '</td></tr>';
        tableTRs.push(tableTR)
      }

      const tableHTML = '<table class="table">' + tableTRs.join('') + '</table>';
      popupHTML = popupHTML.replace('[GEOJSON_PROPERTIES_TABLE]', tableHTML);

      return null;
    }

    const firstVehicle = vehicles[0];

    const providerName = firstVehicle.provider;
    popupHTML = popupHTML.replace('[POI_NAME]', providerName);

    const tableTRs: string[] = [];
    tableTRs.push('<tr><td style="width:75px;">Name</td><td>' + firstVehicle.name + '</td></tr>');
    tableTRs.push('<tr><td>Code</td><td>' + firstVehicle.code + '</td></tr>');

    if (firstVehicle.isFixedStation) {
      const vehicleTypeRows: string[] = [];
      vehicles.forEach(vehicle => {
        const suffix = vehicle.vehiclesNo === 1 ? '' : 's';
        let vehicleTypeS = vehicle.vehiclesNo + ' ' + vehicle.vehicleType + suffix;
        if (vehicle.vehicleName !== null) {
          vehicleTypeS += ' - ' + vehicle.vehicleName;
        }

        vehicleTypeRows.push('<li>' + vehicleTypeS + '</li>');
      });

      tableTRs.push('<tr><td class="align-middle">Vehicles</td><td><ul>' + vehicleTypeRows.join('') + '</ul></td></tr>');
    }

    const popupRows = [
      '<table class="table">' + tableTRs.join('') + '</table>',
    ];

    const contentHTML = '<div class="popup-shared-mobility">' + popupRows.join('') + '</div>';
    popupHTML = popupHTML.replace('[GEOJSON_PROPERTIES_TABLE]', contentHTML);

    return popupHTML;
  }
}
