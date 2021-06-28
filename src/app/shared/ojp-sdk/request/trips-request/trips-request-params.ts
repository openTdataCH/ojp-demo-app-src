import { Location } from "../../location/location";
import { TripMotType } from "../../types/trip-mot-type";

export class TripsRequestParams {
  fromLocation: Location
  toLocation: Location
  departureDate: Date
  motType: TripMotType

  constructor(fromLocation: Location, toLocation: Location, departureDate: Date) {
    this.fromLocation = fromLocation
    this.toLocation = toLocation
    this.departureDate = departureDate
    this.motType = 'Default'
  }

  public static initWithLocationsAndDate(
    fromLocation: Location | null,
    toLocation: Location | null,
    departureDate: Date
  ): TripsRequestParams | null {
    if ((fromLocation === null) || (toLocation === null)) {
      return null;
    }

    // Both locations should have a geoPosition OR stopPlace
    if (!((fromLocation.geoPosition || fromLocation.stopPlace) && (toLocation.geoPosition || toLocation.stopPlace))) {
      return null;
    }

    const tripRequestParams = new TripsRequestParams(fromLocation, toLocation, departureDate)
    return tripRequestParams
  }
}
