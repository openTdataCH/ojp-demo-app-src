import { Location } from "../../location/location"
import { TripMotType } from "../../types/trip-mot-type";

export class JourneyRequestParams {
  journeyLocations: Location[]
  tripMotTypes: TripMotType[]
  departureDate: Date

  constructor(
    fromLocation: Location,
    toLocation: Location,
    viaLocations: Location[] = [],
    tripMotTypes: TripMotType[] = [],
    departureDate: Date = new Date()
  ) {
    this.journeyLocations = []
    this.journeyLocations.push(fromLocation)
    this.journeyLocations = this.journeyLocations.concat(viaLocations)
    this.journeyLocations.push(toLocation)

    this.tripMotTypes = tripMotTypes
    this.departureDate = departureDate
  }

  public static initWithLocationsAndDate(
    fromLocation: Location | null,
    toLocation: Location | null,
    viaLocations: Location[],
    tripMotTypes: TripMotType[],
    departureDate: Date
  ): JourneyRequestParams | null {
    if ((fromLocation === null) || (toLocation === null)) {
      return null;
    }

    // Both locations should have a geoPosition OR stopPlace
    if (!((fromLocation.geoPosition || fromLocation.stopPlace) && (toLocation.geoPosition || toLocation.stopPlace))) {
      console.error('JourneyRequestParams.initWithLocationsAndDate - broken from, to')
      console.log(fromLocation)
      console.log(toLocation)
      return null;
    }

    // Via locations should have a geoPosition
    let hasBrokenVia = false
    viaLocations.forEach(location => {
      if (location.geoPosition === null) {
        hasBrokenVia = true
      }
    })
    if (hasBrokenVia) {
      console.error('JourneyRequestParams.initWithLocationsAndDate - broken via')
      console.log(viaLocations)
      return null;
    }

    if ((viaLocations.length + 1) !== tripMotTypes.length) {
      console.error('JourneyRequestParams.initWithLocationsAndDate - wrong via/mot types')
      console.log(viaLocations)
      console.log(tripMotTypes)
      return null;
    }

    const requestParams = new JourneyRequestParams(fromLocation, toLocation, viaLocations, tripMotTypes, departureDate)
    return requestParams
  }
}
