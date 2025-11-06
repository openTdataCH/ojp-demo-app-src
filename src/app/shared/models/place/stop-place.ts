import * as OJP_SharedTypes from 'ojp-shared-types';
import * as OJP_Next from 'ojp-sdk-next';

// TODO - remove after migration
import OJP_Legacy from '../../../config/ojp-legacy';

import { BasePlace } from '../place';

export class StopPlace extends BasePlace {
  public stopName: string;
  public stopRef: string;

  private constructor(longitude: number, latitude: number, placeName: string, stopName: string, stopRef: string) {
    super(longitude, latitude, 'stop', placeName);
    this.stopName = stopName;
    this.stopRef = stopRef;
  }

  public static Empty(stopName: string = 'n/a') {
    const stopPlace = new StopPlace(0, 0, 'n/a', stopName, 'n/a');
    return stopPlace;
  }

  public static initWithPlaceResultSchema(placeResultSchema: OJP_SharedTypes.PlaceResultSchema): StopPlace | null {
    const stopPlaceRef = placeResultSchema.place.stopPlace?.stopPlaceRef ?? null;
    if (stopPlaceRef === null) {
      return null;
    }

    const stopPlaceName: string = (() => {
      const stopPlaceName = placeResultSchema.place.stopPlace?.stopPlaceName ?? null;
      if (stopPlaceName) {
        return stopPlaceName.text;
      }

      const stopName = placeResultSchema.place.name.text;

      return stopName;
    })();

    const geoPosition = new OJP_Next.GeoPosition(placeResultSchema.place.geoPosition);
    if (!geoPosition.isValid()) {
      return null;
    }

    const placeName = placeResultSchema.place.name.text;

    const stopPlace = new StopPlace(geoPosition.longitude, geoPosition.latitude, placeName, stopPlaceName, stopPlaceRef);
    return stopPlace;
  }

  public override computeName() {
    return this.stopName;
  }

  public override asOJP_LegacyLocation(): OJP_Legacy.Location {
    const location = OJP_Legacy.Location.initWithStopPlaceRef(this.stopRef, this.stopName);
    location.geoPosition = new OJP_Legacy.GeoPosition(this.longitude, this.latitude);

    return location;
  }
}
