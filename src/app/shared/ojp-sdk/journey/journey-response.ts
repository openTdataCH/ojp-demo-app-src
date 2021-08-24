import { Duration } from "../shared/duration";
import { Trip, TripLeg } from "../trip";
import { JourneySection } from "./journey-section";

export class JourneyResponse {
  public sections: JourneySection[]

  constructor(sections: JourneySection[]) {
    this.sections = sections
  }

  public computeAggregatedTrips(): Trip[] {
    let aggregatedTrips: Trip[] = []
    let prevLegs: TripLeg[] = []
    let prevDistance: number = 0
    let prevDurationMinutes: number = 0
    
    const hasMultipleSections = this.sections.length > 1

    this.sections.forEach((section, idx) => {
      const isLast = idx === (this.sections.length - 1)

      if (isLast) {
        section.response.trips.forEach(trip => {
          if (hasMultipleSections) {
            let firstValidTrip = this.computeFirstValidTrip()
            if (firstValidTrip) {
              trip.stats.startDatetime = firstValidTrip.stats.startDatetime
            } else {
              trip.stats.startDatetime = new Date()
            }

            // Sum the first sections count which are monomodals
            trip.stats.transferNo += (this.sections.length - 1)

            trip.stats.distanceMeters += prevDistance
            
            const tripDurationMinutes = prevDurationMinutes + trip.stats.duration.totalMinutes
            trip.stats.duration = Duration.initFromTotalMinutes(tripDurationMinutes)
          }

          trip.legs = prevLegs.concat(trip.legs)
          // TODO - change also TripStats
          // trip.stats = alter with prev legs
        });

        aggregatedTrips = section.response.trips
      } else {
        const hasTrips = section.response.trips.length > 0
        if (hasTrips) {
          // Keep the first trip, it contains the MOT-related data.
          const firstTrip = section.response.trips[0]
          prevLegs = prevLegs.concat(firstTrip.legs)
          prevDistance += firstTrip.stats.distanceMeters

          prevDurationMinutes += firstTrip.stats.duration.totalMinutes
        }
      }
    })

    return aggregatedTrips
  }

  private computeFirstValidTrip(): Trip | null {
    for (let section of this.sections) {
      const hasTrips = section.response.trips.length > 0;
      if (hasTrips) {
        return section.response.trips[0]
      }
    }

    return null
  }
}
