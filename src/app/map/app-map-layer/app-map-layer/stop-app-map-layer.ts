import * as GeoJSON from 'geojson'

import OJP_Legacy from '../../../config/ojp-legacy';

import { AppMapLayer } from "../app-map-layer";

export class StopAppMapLayer extends AppMapLayer {
  protected override annotateFeatureFromLocations(feature: GeoJSON.Feature, locations: OJP_Legacy.Location[]) {
    if (feature.properties === null) {
      return;
    }

    if (locations.length === 0) {
      return;
    }

    const location = locations[0];
    if (location.stopPlace === null) {
      return;
    }

    const featureStopPlaceRef = location.stopPlace.stopPlaceRef;
    feature.properties['stopPlace.stopPlaceRef'] = featureStopPlaceRef;
    feature.properties['stopPlace.stopPlaceName'] = location.stopPlace.stopPlaceName;

    let featureStopPlaceRefLabel = featureStopPlaceRef.slice();
    // TEST LA issue - long ids are too long - trim the Mapbox layer label if needed
    const maxCharsNo = 32;
    if (featureStopPlaceRefLabel.length > maxCharsNo) {
      featureStopPlaceRefLabel = featureStopPlaceRef.substring(0, maxCharsNo) + '...';
    }
    feature.properties['stopPlace.stopPlaceRefLabel'] = featureStopPlaceRefLabel;
  }

  protected override computePopupHTML(locations: OJP_Legacy.Location[]): string | null {
    if (locations.length === 0) {
      return null;
    }

    const popupWrapperDIV = document.getElementById('map-endpoint-stop-picker-popup') as HTMLElement;
    if (popupWrapperDIV === null) {
      return null;
    }

    const firstLocation = locations[0];
    const stopName = firstLocation.computeLocationName();
    const stopId = firstLocation.stopPlace?.stopPlaceRef ?? null;
    if (stopName === null || stopId === null) {
      return null;
    }

    let popupHTML = popupWrapperDIV.innerHTML;

    popupHTML = popupHTML.replace('[STOP_NAME]', stopName);
    popupHTML = popupHTML.replace('[STOP_ID]', stopId);

    return popupHTML;
  }
}
