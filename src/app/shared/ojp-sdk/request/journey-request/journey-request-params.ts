import { Location } from "../../location/location"
import { TripLocationPoint } from "../../trip";
import { IndividualTransportMode } from "../../types/individual-mode.types";
import { TripModeType } from "../../types/trip-mot-type";

export class JourneyRequestParams {
  tripLocations: TripLocationPoint[]
  tripModeTypes: TripModeType[]
  transportModes: IndividualTransportMode[]
  departureDate: Date

  constructor(tripLocations: TripLocationPoint[], tripModeTypes: TripModeType[], transportModes: IndividualTransportMode[], departureDate: Date) {

    this.tripLocations = tripLocations;
    this.tripModeTypes = tripModeTypes
    this.transportModes = transportModes
    this.departureDate = departureDate
  }

  public static initWithLocationsAndDate(
    fromTripLocation: TripLocationPoint | null,
    toTripLocation: TripLocationPoint | null,
    viaTripLocations: TripLocationPoint[],
    tripModeTypes: TripModeType[],
    transportModes: IndividualTransportMode[],
    departureDate: Date
  ): JourneyRequestParams | null {
    if ((fromTripLocation === null) || (toTripLocation === null)) {
      return null;
    }

    // Both locations should have a geoPosition OR stopPlace
    if (!((fromTripLocation.location.geoPosition || fromTripLocation.location.stopPlace) && (toTripLocation.location.geoPosition || toTripLocation.location.stopPlace))) {
      console.error('JourneyRequestParams.initWithLocationsAndDate - broken from, to')
      console.log(fromTripLocation)
      console.log(toTripLocation)
      return null;
    }

    // Via locations should have a geoPosition
    let hasBrokenVia = false
    viaTripLocations.forEach(tripLocation => {
      if (tripLocation.location.geoPosition === null) {
        hasBrokenVia = true
      }
    })
    if (hasBrokenVia) {
      console.error('JourneyRequestParams.initWithLocationsAndDate - broken via')
      console.log(viaTripLocations)
      return null;
    }

    if ((viaTripLocations.length + 1) !== tripModeTypes.length) {
      console.error('JourneyRequestParams.initWithLocationsAndDate - wrong via/mot types')
      console.log(viaTripLocations)
      console.log(tripModeTypes)
      return null;
    }

    let tripLocations: TripLocationPoint[] = [];
    tripLocations.push(fromTripLocation)
    tripLocations = tripLocations.concat(viaTripLocations);
    tripLocations.push(toTripLocation);

    const requestParams = new JourneyRequestParams(tripLocations, tripModeTypes, transportModes, departureDate)

    return requestParams
  }
}
