import * as OJP_SharedTypes from 'ojp-shared-types';
import * as OJP_Next from 'ojp-sdk-next';

export class StopPlace extends OJP_Next.GeoPosition {
  public name: string;
  public stopPlaceRef: string;

  public constructor(longitude: number, latitude: number, name: string, stopPlaceRef: string) {
    super(longitude, latitude);
    this.name = name;
    this.stopPlaceRef = stopPlaceRef;
  }

  public static initWithPlaceResultSchema(placeResultSchema: OJP_SharedTypes.PlaceResultSchema): StopPlace | null {
    const stopPlaceRef = placeResultSchema.place.stopPlace?.stopPlaceRef ?? null;
    if (stopPlaceRef === null) {
      return null;
    }

    const stopName: string = (() => {
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

    const stopPlace = new StopPlace(geoPosition.longitude, geoPosition.latitude, stopName, stopPlaceRef);
    return stopPlace;
  }
}
