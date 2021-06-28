import { Trip, TripLeg } from "../trip";
import { JourneySection } from "./journey-section";

export class JourneysResponse {
  public sections: JourneySection[]

  constructor(sections: JourneySection[]) {
    this.sections = sections
  }

  public computeAggregatedTrips(): Trip[] {
    let aggregatedTrips: Trip[] = []
    let prevLegs: TripLeg[] = []

    this.sections.forEach((section, idx) => {
      const isLast = idx === (this.sections.length - 1)

      if (isLast) {
        section.response.trips.forEach(trip => {
          trip.legs = prevLegs.concat(trip.legs)
          // TODO - change also TripStats
          // trip.stats = alter with prev legs
        });

        aggregatedTrips = section.response.trips
      } else {
        const hasTrips = section.response.trips.length > 0
        if (hasTrips) {
          const firstTrip = section.response.trips[0]
          prevLegs = prevLegs.concat(firstTrip.legs)
        }
      }
    })

    return aggregatedTrips
  }
}
