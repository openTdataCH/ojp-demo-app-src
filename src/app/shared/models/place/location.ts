import * as OJP_Next from 'ojp-sdk-next';

import { BasePlace } from '../place';

export class PlaceLocation extends BasePlace {
  public constructor(longitude: number, latitude: number, placeName: string | null = null) {
    if (placeName === null) {
        const geoPosition = new OJP_Next.GeoPosition(longitude, latitude);
        placeName = geoPosition.asLatLngString();
    }

    super(longitude, latitude, 'location', placeName);
  }
}
