import * as GeoJSON from 'geojson'

import { OJP_VERSION } from '../../../config/constants';
import { AppMapLayer } from "../app-map-layer";
import { SharedMobility } from './shared-mobility/shared-mobility';

import { AnyPlace } from '../../../shared/models/place/place-builder';

export class SharedMobilityAppMapLayer extends AppMapLayer {
  protected override annotateFeatureFromLocations(feature: GeoJSON.Feature, places: AnyPlace[]): void {
    if (feature.properties === null) {
      return;
    }

    if (places.length === 0) {
      return;
    }

    const isOJPv2 = OJP_VERSION === '2.0';

    let itemsNo: number | null = null;
    places.forEach(location => {
      const vehicle = SharedMobility.initFromPlace(location);
      if (vehicle === null) {
        return;
      }

      if ((vehicle.vehiclesNo === null) && (vehicle.electricVehiclesNo === null)) {
        if (isOJPv2) {
          if (vehicle.poiType === 'bicycle_rental') {
            // HACK - for publibike bicycle rental show always 1 vehicle if vehiclesNo attr is missing
            itemsNo = 1;
          }
        }
      } else {
        if (itemsNo === null) {
          itemsNo = 0;
        }

        if (vehicle.vehiclesNo !== null) {
          itemsNo += vehicle.vehiclesNo;
        }

        if (vehicle.electricVehiclesNo !== null) {
          itemsNo += vehicle.electricVehiclesNo;
        }
      }
    });

    if (itemsNo !== null) {
      feature.properties['sharedVehicle.itemsNo'] = itemsNo;
    }

    const vehicle = SharedMobility.initFromPlace(places[0]);
    if (vehicle) {
      feature.properties['sharedVehicle.provider'] = vehicle.computeProviderLabel();
    }
  }

  private formatVehiclesNo(attr: number, vehicle: SharedMobility) {
    const suffix = attr === 1 ? '' : 's';
    let vehicleTypeS = attr + ' ' + vehicle.vehicleType + suffix;
    if (vehicle.vehicleName !== null) {
      vehicleTypeS += ' - ' + vehicle.vehicleName;
    }

    return vehicleTypeS;
  }

  protected override computePopupHTML(places: AnyPlace[]): string | null {
    if (places.length === 0) {
      return null;
    }

    const popupWrapperDIV = document.getElementById('map-poi-picker-popup') as HTMLElement;
    if (popupWrapperDIV === null) {
      return null;
    }

    let popupHTML = popupWrapperDIV.innerHTML;

    const vehicles: SharedMobility[] = [];
    places.forEach(location => {
      const vehicle = SharedMobility.initFromPlace(location);
      if (vehicle) {
        vehicles.push(vehicle);
      }
    });

    if (vehicles.length === 0) {
      const firstPlace = places[0];

      popupHTML = popupHTML.replace('[POI_NAME]', 'GENERIC SHARED MOBILITY');

      const tableTRs: string[] = []
      for (let key in firstPlace.properties) {
        let value = firstPlace.properties[key];
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
        if (vehicle.vehiclesNo !== null) {
          const vehicleTypeS = this.formatVehiclesNo(vehicle.vehiclesNo, vehicle);
          vehicleTypeRows.push('<li>' + vehicleTypeS + '</li>');
        }
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
