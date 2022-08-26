import { TripLocationPoint } from "../../trip";
import { IndividualTransportMode } from "../../types/individual-mode.types";
import { TripModeType } from "../../types/trip-mot-type";

export class TripsRequestParams {
  fromTripLocation: TripLocationPoint
  toTripLocation: TripLocationPoint
  departureDate: Date
  modeType: TripModeType
  transportMode: IndividualTransportMode

  constructor(fromTripLocation: TripLocationPoint, toTripLocation: TripLocationPoint, departureDate: Date) {
    this.fromTripLocation = fromTripLocation
    this.toTripLocation = toTripLocation
    this.departureDate = departureDate
    
    this.modeType = 'monomodal'
    this.transportMode = 'public_transport'
  }

  public static initWithLocationsAndDate(
    fromTripLocation: TripLocationPoint | null,
    toTripLocation: TripLocationPoint | null,
    departureDate: Date
  ): TripsRequestParams | null {
    if ((fromTripLocation === null) || (toTripLocation === null)) {
      return null;
    }

    // Both locations should have a geoPosition OR stopPlace
    if (!((fromTripLocation.location.geoPosition || fromTripLocation.location.stopPlace) && (toTripLocation.location.geoPosition || toTripLocation.location.stopPlace))) {
      return null;
    }

    const tripRequestParams = new TripsRequestParams(fromTripLocation, toTripLocation, departureDate)
    return tripRequestParams
  }
}
