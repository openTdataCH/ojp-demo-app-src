import { StageConfig } from "../../config/config";
import { JourneySection } from "../../journey/journey-section";
import { JourneysResponse } from "../../journey/journeys-response";
import { Trip } from "../../trip";
import { OJPBaseRequest } from "../base-request";
import { TripRequest } from "../trips-request/trips-request";
import { TripsRequestParams } from "../trips-request/trips-request-params";
import { JourneyRequestParams } from "./journey-request-params";

export class JourneyRequest extends OJPBaseRequest {
  public requestParams: JourneyRequestParams

  constructor(stageConfig: StageConfig, requestParams: JourneyRequestParams) {
    super(stageConfig);
    this.requestParams = requestParams;
  }

  public fetchResponse(completion: (response: Trip[]) => void) {
    const journeysResponse = new JourneysResponse([])
    const tripDepartureDate = this.requestParams.departureDate
    this.computeTripResponse(0, tripDepartureDate, journeysResponse, completion)
  }

  private computeTripResponse(idx: number, tripDepartureDate: Date, journeysResponse: JourneysResponse, completion: (response: Trip[]) => void) {
    const isLastJourneySegment = idx === (this.requestParams.tripMotTypes.length - 1)

    const fromLocation = this.requestParams.journeyLocations[idx]
    const toLocation = this.requestParams.journeyLocations[idx + 1]

    const tripRequestParams = TripsRequestParams.initWithLocationsAndDate(fromLocation, toLocation, tripDepartureDate)
    if (tripRequestParams === null) {
      console.error('JourneyRequest - TripsRequestParams null for trip idx ' + idx)
      return
    }

    tripRequestParams.motType = this.requestParams.tripMotTypes[idx]

    const tripRequest = new TripRequest(this.stageConfig, tripRequestParams);
    tripRequest.fetchResponse(tripsResponse => {
      const journeySection = new JourneySection(
        tripRequest.computeRequestXML(),
        tripsResponse
      )
      journeysResponse.sections.push(journeySection)

      if (isLastJourneySegment) {
        const trips = journeysResponse.computeAggregatedTrips()
        completion(trips)
      } else {
        const hasTrips = tripsResponse.trips.length > 0
        if (hasTrips) {
          const firstTrip = tripsResponse.trips[0]
          tripDepartureDate = firstTrip.stats.endDatetime
        }

        this.computeTripResponse(idx + 1, tripDepartureDate, journeysResponse, completion)
      }
    })
  }
}
