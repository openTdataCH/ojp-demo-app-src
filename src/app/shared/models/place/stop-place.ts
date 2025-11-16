import * as OJP_SharedTypes from 'ojp-shared-types';
import * as OJP_Next from 'ojp-sdk-next';

// TODO - remove after migration
import OJP_Legacy from '../../../config/ojp-legacy';

import { BasePlace } from '../place';

import { AnyPlaceResultSchema } from '../../types/_all';

export class StopPlace extends BasePlace {
  public stopName: string;
  public stopRef: string;

  public constructor(longitude: number, latitude: number, placeName: string, stopName: string, stopRef: string) {
    super(longitude, latitude, 'stop', placeName);
    this.stopName = stopName;
    this.stopRef = stopRef;
  }
  
  public static Empty(stopName: string = 'n/a') {
    const stopPlace = new StopPlace(0, 0, 'n/a', stopName, 'n/a');
    return stopPlace;
  }

  public static initWithPlaceResultSchema(version: OJP_Next.OJP_VERSION, placeResultSchema: AnyPlaceResultSchema): StopPlace | null {
    const isOJPv2 = version === '2.0';

    const stopPlaceSchema: OJP_SharedTypes.StopPlaceSchema | null = (() => {
      if (isOJPv2) {
        return (placeResultSchema as OJP_SharedTypes.PlaceResultSchema).place.stopPlace ?? null;
      } else {
        return (placeResultSchema as OJP_SharedTypes.OJPv1_LocationResultSchema).location.stopPlace ?? null;
      }
    })();

    if (stopPlaceSchema === null) {
      return null;
    }

    const stopPlaceRef = stopPlaceSchema.stopPlaceRef ?? null;
    if (stopPlaceRef === null) {
      return null;
    }

    const placeName = (() => {
      if (isOJPv2) {
        return (placeResultSchema as OJP_SharedTypes.PlaceResultSchema).place.name.text;
      } else {
        return (placeResultSchema as OJP_SharedTypes.OJPv1_LocationResultSchema).location.locationName.text;
      }
    })();
    
    const stopPlaceName = (() => {
      const stopPlaceName = stopPlaceSchema.stopPlaceName ?? null;
      if (stopPlaceName) {
        return stopPlaceName.text;
      }

      return placeName;
    })();

    const geoPositioSchema = (() => {
      if (isOJPv2) {
        return (placeResultSchema as OJP_SharedTypes.PlaceResultSchema).place.geoPosition;
      } else {
        return (placeResultSchema as OJP_SharedTypes.OJPv1_LocationResultSchema).location.geoPosition;
      }
    })();
    const geoPosition = new OJP_Next.GeoPosition(geoPositioSchema);
    if (!geoPosition.isValid()) {
      return null;
    }

    const stopPlace = new StopPlace(geoPosition.longitude, geoPosition.latitude, placeName, stopPlaceName, stopPlaceRef);
    return stopPlace;
  }

  public override computeName() {
    return this.stopName;
  }

  public override asOJP_LegacyLocation(): OJP_Legacy.Location {
    const location = OJP_Legacy.Location.initWithStopPlaceRef(this.stopRef, this.stopName);
    location.updateLegacyGeoPosition(this.geoPosition.longitude, this.geoPosition.latitude);

    return location;
  }
}
