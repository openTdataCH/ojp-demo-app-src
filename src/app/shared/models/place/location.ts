import * as OJP_Next from 'ojp-sdk-next';

import { BasePlace } from '../place';

export class PlaceLocation extends BasePlace {
  public constructor(longitude: number, latitude: number, placeName: string | null = null) {
    super(longitude, latitude, 'location', placeName ?? 'n/a');
    if (placeName === null) {
      this.placeName = this.geoPosition.asLatLngString();
    }
  }
}
