import * as OJP_Next from 'ojp-sdk-next';

// DELETE after migration
import OJP_Legacy from '../../../config/ojp-legacy';

import { Address } from './address';
import { StopPlace } from './stop-place';
import { Poi } from './poi';
import { PlaceLocation } from './location';
import { AnyPlaceResultSchema } from '../../types/_all';

export type AnyPlace = Address | PlaceLocation | Poi | StopPlace;

export class PlaceBuilder {
  public static initWithPlaceResultSchema(version: OJP_Next.OJP_VERSION, placeResultSchema: AnyPlaceResultSchema): AnyPlace | null {
    let placeStopPlace: StopPlace | null = null;
    try {
      placeStopPlace = StopPlace.initWithPlaceResultSchema(version, placeResultSchema);
    } catch (error) {
      console.error('StopPlace.initWithPlaceResultSchema:', error);
      console.log(placeResultSchema);
    }
    if (placeStopPlace) {
      return placeStopPlace;
    }

    let placeAddress: Address | null = null;
    try {
      placeAddress = Address.initWithPlaceResultSchema(version, placeResultSchema);
    } catch (error) {
      console.error('Address.initWithPlaceResultSchema:', error);
      console.log(placeResultSchema);
    }
    if (placeAddress) {
      return placeAddress;
    }

    let placePoi: Poi | null = null;
    try {
      placePoi = Poi.initWithPlaceResultSchema(version, placeResultSchema);
    } catch (error) {
      console.error('Poi.initWithPlaceResultSchema:', error);
      console.log(placeResultSchema);
    }
    if (placePoi) {
      return placePoi;
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

export function sortPlaces(places: AnyPlace[], anotherPlace: AnyPlace, ascending: boolean = true): AnyPlace[] {
  const sortedPlaces = [...places].sort((a, b) => {
    const dA = anotherPlace.geoPosition.distanceFrom(a.geoPosition);
    const dB = anotherPlace.geoPosition.distanceFrom(b.geoPosition);

    return ascending ? dA - dB : dB - dA;
  });

  return sortedPlaces;
}
