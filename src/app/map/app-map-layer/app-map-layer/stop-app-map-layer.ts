import * as GeoJSON from 'geojson'

import OJP_Legacy from '../../../config/ojp-legacy';

import { AppMapLayer } from "../app-map-layer";

import { AnyPlace } from '../../../shared/models/place/place-builder';
import { StopPlace } from '../../../shared/models/place/stop-place';

export class StopAppMapLayer extends AppMapLayer {
  protected override annotateFeatureFromLocations(feature: GeoJSON.Feature, places: AnyPlace[]) {
    if (feature.properties === null) {
      return;
    }

    if (places.length === 0) {
      return;
    }

    const place = places[0];
    if (place.type !== 'stop') {
      return;
    }

    const stopPlace = place as StopPlace;

    const featureStopPlaceRef = stopPlace.stopRef;
    feature.properties['stopPlace.stopPlaceRef'] = featureStopPlaceRef;
    feature.properties['stopPlace.stopPlaceName'] = stopPlace.stopName;

    let featureStopPlaceRefLabel = featureStopPlaceRef.slice();
    // TEST LA issue - long ids are too long - trim the Mapbox layer label if needed
    const maxCharsNo = 32;
    if (featureStopPlaceRefLabel.length > maxCharsNo) {
      featureStopPlaceRefLabel = featureStopPlaceRef.substring(0, maxCharsNo) + '...';
    }
    feature.properties['stopPlace.stopPlaceRefLabel'] = featureStopPlaceRefLabel;
  }

  protected override computePopupHTML(places: AnyPlace[]): string | null {
    if (places.length === 0) {
      return null;
    }

    const popupWrapperDIV = document.getElementById('map-endpoint-stop-picker-popup') as HTMLElement;
    if (popupWrapperDIV === null) {
      return null;
    }

    const place = places[0];
    if (place.type !== 'stop') {
      return null;
    }

    const stopPlace = place as StopPlace;

    const stopName = stopPlace.stopName;
    const stopId = stopPlace.stopRef;

    let popupHTML = popupWrapperDIV.innerHTML;

    popupHTML = popupHTML.replace('[STOP_NAME]', stopName);
    popupHTML = popupHTML.replace('[STOP_ID]', stopId);

    return popupHTML;
  }
}
