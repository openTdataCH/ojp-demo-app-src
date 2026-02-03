import * as GeoJSON from 'geojson';

import * as OJP_Types from 'ojp-shared-types';
import * as OJP from 'ojp-sdk';

import { BasePlace } from '../place';

import { AnyPlaceResultSchema } from '../../types/_all';
import { PlaceRef, PlaceRefSourceType } from '../place-ref';

export class StopPlace extends BasePlace {
  public placeRef: PlaceRef;

  public parentRef: string | null;
  public plannedQuay: string | null;
  public estimatedQuay: string | null;

  private constructor(longitude: number, latitude: number, placeName: string, placeRef: PlaceRef) {
    super(longitude, latitude, 'stop', placeName);
    this.placeRef = placeRef;

    this.parentRef = null;
    this.plannedQuay = null;
    this.estimatedQuay = null;
  }
  
  public static Empty(stopName: string = 'n/a') {
    const placeRef = new PlaceRef(stopName, 'n/a');
    const stopPlace = new StopPlace(0, 0, 'n/a', placeRef);
    return stopPlace;
  }

  // static init to avoid exposing subType
  public static initWithCoordsRefAndName(longitude: number, latitude: number, placeName: string, stopName: string, stopRef: string) {
    const placeRef = new PlaceRef(stopName, stopRef);
    const stopPlace = new StopPlace(longitude, latitude, placeName, placeRef);
    return stopPlace;
  }

  public static initWithPlaceResultSchema(version: OJP.OJP_VERSION, placeResultSchema: AnyPlaceResultSchema): StopPlace | null {
    const isOJPv2 = version === '2.0';

    const stopPlaceSchema: OJP_Types.StopPlaceSchema | null = (() => {
      if (isOJPv2) {
        return (placeResultSchema as OJP_Types.PlaceResultSchema).place.stopPlace ?? null;
      } else {
        return (placeResultSchema as OJP_Types.OJPv1_LocationResultSchema).location.stopPlace ?? null;
      }
    })();

    const stopPointSchema: OJP_Types.StopPointSchema | null = (() => {
      if (isOJPv2) {
        return (placeResultSchema as OJP_Types.PlaceResultSchema).place.stopPoint ?? null;
      } else {
        return (placeResultSchema as OJP_Types.OJPv1_LocationResultSchema).location.stopPoint ?? null;
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

    const stopPlaceName = (() => {
      if (stopPlaceSchema && stopPlaceSchema.stopPlaceName) {
        return stopPlaceSchema.stopPlaceName.text;
      }

      if (stopPointSchema && stopPointSchema.stopPointName) {
        return stopPointSchema.stopPointName.text;
      }

      return null;
    })();

    if (stopPlaceName === null) {
      console.error('cant compute stopPlaceName / stopPointName');
      return null;
    }

    const placeName = (() => {
      if (isOJPv2) {
        const nodeName = (placeResultSchema as OJP_Types.PlaceResultSchema).place.name ?? null;
        if (nodeName === null) {
          console.error('cant find place.name, using place.stopPlaceName instead');
          return stopPlaceName + ' (see console.error)';
        }

        return nodeName.text;
      } else {
        return (placeResultSchema as OJP_Types.OJPv1_LocationResultSchema).location.locationName.text;
      }
    })();

    const geoPositioSchema = (() => {
      if (isOJPv2) {
        return (placeResultSchema as OJP_Types.PlaceResultSchema).place.geoPosition;
      } else {
        return (placeResultSchema as OJP_Types.OJPv1_LocationResultSchema).location.geoPosition;
      }
    })();
    const geoPosition = new OJP.GeoPosition(geoPositioSchema);
    if (!geoPosition.isValid()) {
      return null;
    }

    const sourceType: PlaceRefSourceType = stopPlaceSchema === null ? 'stop-point' : 'stop-point';
    const placeRef = new PlaceRef(stopPlaceName, stopPlaceRef, sourceType);

    const stopPlace = new StopPlace(geoPosition.longitude, geoPosition.latitude, placeName, placeRef);

    if (stopPointSchema !== null) {
      stopPlace.parentRef = stopPointSchema.parentRef ?? null;
      stopPlace.plannedQuay = stopPointSchema.plannedQuay?.text ?? null;
      stopPlace.estimatedQuay = stopPointSchema.estimatedQuay?.text ?? null;
    }

    return stopPlace;
  }

  public override computeName() {
    return this.placeRef.name;
  }

  public override asGeoJSONFeature(): GeoJSON.Feature<GeoJSON.Point> {
    const feature = super.asGeoJSONFeature();
    
    if (feature.properties) {
      feature.properties['stopPlace.stopPlaceRef'] = this.placeRef.ref;
      feature.properties['stopPlace.stopPlaceName'] = this.placeRef.name;
      feature.properties['stopPlace.refSource'] = this.placeRef.source;
    }
    
    return feature;
  }
}
