import * as OJP_Next from 'ojp-sdk-next';

import { Address } from './address';
import { StopPlace } from './stop-place';
import { Poi } from './poi';
import { PlaceLocation } from './location';
import { AnyPlaceResultSchema } from '../../types/_all';
import { TopographicPlace } from './topographic-place';

export type AnyPlace = Address | PlaceLocation | Poi | StopPlace | TopographicPlace;

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

    let placeTopographicPlace: TopographicPlace | null = null;
    try {
      placeTopographicPlace = TopographicPlace.initWithPlaceResultSchema(version, placeResultSchema);
    } catch (error) {
      console.error('TopographicPlace.initWithPlaceResultSchema:', error);
      console.log(placeResultSchema);
    }
    if (placeTopographicPlace) {
      return placeTopographicPlace;
    }

    return null;
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
