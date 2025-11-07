import * as OJP_SharedTypes from 'ojp-shared-types';
// DELETE after migration
import OJP_Legacy from '../../../config/ojp-legacy';

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

  // TODO - remove after migration
  public static initWithLegacyLocation(location: OJP_Legacy.Location | null) {
    if ((location === null) || (location.geoPosition === null)) {
      return null;
    }

    if (location.stopPlace) {
      const place = new StopPlace(
        location.geoPosition.longitude, 
        location.geoPosition.latitude,
        location.locationName ?? 'n/a location.locationName',
        location.stopPlace.stopPlaceName ?? 'n/a location.stopPlace.stopPlaceName',
        location.stopPlace.stopPlaceRef,
      );

      return place;
    }

    const place = new PlaceLocation(
      location.geoPosition.longitude, 
      location.geoPosition.latitude, 
      location.locationName
    );

    return place;
  }
}
