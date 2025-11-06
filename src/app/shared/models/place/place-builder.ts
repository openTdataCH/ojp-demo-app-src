import * as OJP_SharedTypes from 'ojp-shared-types';

import { Address } from './address';
import { StopPlace } from './stop-place';
import { Poi } from './poi';
import { PlaceLocation } from './location';

export type AnyPlace = Address | PlaceLocation | Poi | StopPlace;

export class PlaceBuilder {
  public static initWithPlaceResultSchema(placeResultSchema: OJP_SharedTypes.PlaceResultSchema): AnyPlace | null {
    if (placeResultSchema.place.stopPlace || placeResultSchema.place.stopPoint) {
      let place: StopPlace | null = null;
      try {
        place = StopPlace.initWithPlaceResultSchema(placeResultSchema);
      } catch (error) {
        console.error('StopPlace.initWithPlaceResultSchema:', error);
        console.log(placeResultSchema);
      }
      if (place) {
        return place;
      }
    }

    if (placeResultSchema.place.address) {
      let place: Address | null = null;
      try {
        place = Address.initWithPlaceResultSchema(placeResultSchema);
      } catch (error) {
        console.error('Address.initWithPlaceResultSchema:', error);
        console.log(placeResultSchema);
      }
      if (place) {
        return place;
      }
    }

    if (placeResultSchema.place.pointOfInterest) {
      let place: Poi | null = null;
      try {
        place = Poi.initWithPlaceResultSchema(placeResultSchema);
      } catch (error) {
        console.error('Address.initWithPlaceResultSchema:', error);
        console.log(placeResultSchema);
      }
      if (place) {
        return place;
      }
    }

    return null;
  }
}
