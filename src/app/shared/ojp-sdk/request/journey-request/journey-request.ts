import { StageConfig } from "../../types/stage-config";
import { JourneySection } from "../../journey/journey-section";
import { JourneyResponse } from "../../journey/journey-response";
import { Trip } from "../../trip";
import { OJPBaseRequest } from "../base-request";
import { TripRequest } from "../trips-request/trips-request";
import { TripsRequestParams } from "../trips-request/trips-request-params";
import { JourneyRequestParams } from "./journey-request-params";
import { RequestErrorData } from "../request-error";

export class JourneyRequest extends OJPBaseRequest {
  public requestParams: JourneyRequestParams
  public lastJourneyResponse: JourneyResponse | null

  constructor(stageConfig: StageConfig, requestParams: JourneyRequestParams) {
    super(stageConfig);
    this.requestParams = requestParams;
    this.lastJourneyResponse = null
  }

  public fetchResponse(completion: (response: Trip[], error: RequestErrorData | null) => void) {
    const journeyResponse = new JourneyResponse([])
    const tripDepartureDate = this.requestParams.departureDate
    this.lastJourneyResponse = null
    this.computeTripResponse(0, tripDepartureDate, journeyResponse, completion)
  }

  private computeTripResponse(idx: number, tripDepartureDate: Date, journeyResponse: JourneyResponse, completion: (response: Trip[], error: RequestErrorData | null) => void) {
    const isLastJourneySegment = idx === (this.requestParams.tripModeTypes.length - 1)

    const fromTripLocation = this.requestParams.tripLocations[idx]
    const toTripLocation = this.requestParams.tripLocations[idx + 1]

    const tripRequestParams = TripsRequestParams.initWithLocationsAndDate(fromTripLocation, toTripLocation, tripDepartureDate)
    if (tripRequestParams === null) {
      console.error('JourneyRequest - TripsRequestParams null for trip idx ' + idx)
      return
    }

    tripRequestParams.modeType = this.requestParams.tripModeTypes[idx];
    tripRequestParams.transportMode = this.requestParams.transportModes[idx];

    const tripRequest = new TripRequest(this.stageConfig, tripRequestParams);
    tripRequest.fetchResponse((tripsResponse, error) => {
      if (error) {
        completion([], error)
        return
      }

      if (tripRequest.lastRequestData) {
        const journeySection = new JourneySection(
          tripRequest.lastRequestData,
          tripsResponse
        )
        journeyResponse.sections.push(journeySection)
      }

      const hasTrips = tripsResponse.trips.length > 0;
      if (!hasTrips) {
        console.error('ERROR: no trips found for section ' + idx + ' MODE - ' + tripRequestParams.modeType + ' + ' + tripRequestParams.transportMode);
        console.log(tripsResponse);
      }

      if (isLastJourneySegment) {
        const trips = journeyResponse.computeAggregatedTrips()
        this.lastJourneyResponse = journeyResponse
        completion(trips, null)
      } else {
        if (hasTrips) {
          const firstTrip = tripsResponse.trips[0]
          tripDepartureDate = firstTrip.stats.endDatetime
        }

        this.computeTripResponse(idx + 1, tripDepartureDate, journeyResponse, completion)
      }
    })
  }
}
