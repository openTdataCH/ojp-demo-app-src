// TODO - remove after migration
import OJP_Legacy from '../../config/ojp-legacy';

import { IndividualTransportMode } from "../types/transport-mode";
import { AnyPlace } from "./place/place-builder";

export class TripPlace {
  public place: AnyPlace;
  public minDuration: number | null;
  public maxDuration: number | null;
  public minDistance: number | null;
  public maxDistance: number | null;
  public customTransportMode: IndividualTransportMode | null;
  public dwellTimeMinutes: number | null;

  private constructor(place: AnyPlace) {
    this.place = place;
    this.minDuration = null;
    this.maxDuration = null;
    this.minDistance = null;
    this.maxDistance = null;
    this.customTransportMode = null;
    this.dwellTimeMinutes = null;
  }

  public static initWithPlace(place: AnyPlace) {
    const tripPlace = new TripPlace(place);
    return tripPlace;
  }

  // TODO - remove after migration
  public asOJP_TripLocationPoint(): OJP_Legacy.TripLocationPoint {
    const location = this.place.asOJP_LegacyLocation();
    const tripLocationPoint = new OJP_Legacy.TripLocationPoint(location);
    return tripLocationPoint;
  }
}
