import * as GeoJSON from 'geojson';

import { AppMapLayer } from "../app-map-layer";

import { AnyPlace } from '../../../shared/models/place/place-builder';
import { Poi } from '../../../shared/models/place/poi';

type LocationStatus = 'available' | 'occupied' | 'unknown' | 'n/a';

export class ChargingStationAppMapLayer extends AppMapLayer {
  protected override annotateFeatureFromLocations(feature: GeoJSON.Feature, places: AnyPlace[]): void {
    if (feature.properties === null) {
      return;
    }

    if (places.length === 0) {
      return;
    }

    let itemsNo = 0;
    places.forEach((location, idx) => {
      const locationStatus = this.computePlaceStatus(location);
      if (locationStatus === 'available') {
        itemsNo += 1;
      }
    });

    feature.properties['sharedVehicle.itemsNo'] = itemsNo;
  }

  private computePlaceStatus(place: AnyPlace): LocationStatus {
    const defaultValue: LocationStatus = 'n/a';

    const locationStatusAttr = place.properties['locationStatus'] ?? null;
    if (locationStatusAttr === null) {
      return defaultValue;
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

    return defaultValue;
  }

  protected override computePopupHTML(places: AnyPlace[]): string | null {
    const popupWrapperDIV = document.getElementById('map-poi-picker-popup') as HTMLElement;
    if (popupWrapperDIV === null) {
      return null;
    }

    if (places.length === 0) {
      return null;
    }

    const firstPlace = places[0];
    if (firstPlace.type !== 'poi') {
      return null;
    }

    const poi = firstPlace as Poi;

    // it could be that we get different POI category
    if (poi.category !== 'charging_station') {
      return null;
    }

    const tableTRs: string[] = [];
    tableTRs.push('<tr><td style="width:50px;">Name</td><td>' + poi.name + ' - ' + firstPlace.placeName + '</td></tr>');

    let codeCleaned = poi.publicCode;
    codeCleaned = codeCleaned.replace(poi.name, '');
    codeCleaned = codeCleaned.replace((firstPlace.placeName ?? 'n/a'), '');
    tableTRs.push('<tr><td>Code</td><td>' + codeCleaned + '</td></tr>');

    const statusLIs: string[] = [];
    places.forEach((place, idx) => {
      if (place.type !== 'poi') {
        return;
      }

      const locationStatus = this.computePlaceStatus(place);

      const locationStatusText = (() => {
        let className = 'bg-secondary';
        if (locationStatus === 'available') {
          className = 'bg-success';
        }
        if (locationStatus === 'occupied') {
          className = 'bg-danger';
        }

        return '<span class="badge rounded-pill ' + className + '">' + locationStatus.toUpperCase() + '</span>';
      })();

      const locationCode = place.properties['code'] ?? null;

      const statusLI = '<li>' + locationStatusText + ' ' + locationCode + '</li>';
      statusLIs.push(statusLI);
    });

    tableTRs.push('<tr><td colspan="2"><p>Chargers (' + places.length + ')</p><ul>' + statusLIs.join('') + '</ul></td></tr>');

    let popupHTML = popupWrapperDIV.innerHTML;
    popupHTML = popupHTML.replace('[POI_NAME]', 'Charging Station');

    const tableHTML = '<table class="table popup-charging-station">' + tableTRs.join('') + '</table>';
    popupHTML = popupHTML.replace('[GEOJSON_PROPERTIES_TABLE]', tableHTML);

    return popupHTML;
  }
}
