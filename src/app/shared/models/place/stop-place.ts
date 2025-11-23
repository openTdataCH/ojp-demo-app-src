import * as OJP_SharedTypes from 'ojp-shared-types';
import * as OJP_Next from 'ojp-sdk-next';

// TODO - remove after migration
import OJP_Legacy from '../../../config/ojp-legacy';

import { BasePlace } from '../place';

import { AnyPlaceResultSchema } from '../../types/_all';

type PlaceSubType = 'stop-point' | 'stop-place';

export class StopPlace extends BasePlace {
  public stopName: string;
  public stopRef: string;
  public subType: PlaceSubType;

  public parentRef: string | null;
  public plannedQuay: string | null;
  public estimatedQuay: string | null;

  private constructor(longitude: number, latitude: number, placeName: string, stopName: string, stopRef: string, subType: PlaceSubType = 'stop-place') {
    super(longitude, latitude, 'stop', placeName);
    this.stopName = stopName;
    this.stopRef = stopRef;
    this.subType = subType;

    this.parentRef = null;
    this.plannedQuay = null;
    this.estimatedQuay = null;
  }
  
  public static Empty(stopName: string = 'n/a') {
    const stopPlace = new StopPlace(0, 0, 'n/a', stopName, 'n/a');
    return stopPlace;
  }

  // static init to avoid exposing subType
  public static initWithCoordsRefAndName(longitude: number, latitude: number, placeName: string, stopName: string, stopRef: string) {
    const stopPlace = new StopPlace(longitude, latitude, placeName, stopName, stopRef);
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

    const stopPointSchema: OJP_SharedTypes.StopPointSchema | null = (() => {
      if (isOJPv2) {
        return (placeResultSchema as OJP_SharedTypes.PlaceResultSchema).place.stopPoint ?? null;
      } else {
        return (placeResultSchema as OJP_SharedTypes.OJPv1_LocationResultSchema).location.stopPoint ?? null;
      }
    })();

    if ((stopPlaceSchema === null) && (stopPointSchema === null)) {
      return null;
    }

    const stopPlaceRef = (() => {
      if (stopPlaceSchema) {
        return stopPlaceSchema.stopPlaceRef ?? null;
      }

      if (stopPointSchema) {
        return stopPointSchema.stopPointRef ?? null;
      }

      return null;
    })(); 
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
      if (stopPlaceSchema && stopPlaceSchema.stopPlaceName) {
        return stopPlaceSchema.stopPlaceName.text;
      }

      if (stopPointSchema && stopPointSchema.stopPointName) {
        return stopPointSchema.stopPointName.text;
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

    const subType: PlaceSubType = stopPlaceSchema === null ? 'stop-point' : 'stop-point';

    const stopPlace = new StopPlace(geoPosition.longitude, geoPosition.latitude, placeName, stopPlaceName, stopPlaceRef, subType);

    if (stopPointSchema !== null) {
      stopPlace.parentRef = stopPointSchema.parentRef ?? null;
      stopPlace.plannedQuay = stopPointSchema.plannedQuay?.text ?? null;
      stopPlace.estimatedQuay = stopPointSchema.estimatedQuay?.text ?? null;
    }

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
