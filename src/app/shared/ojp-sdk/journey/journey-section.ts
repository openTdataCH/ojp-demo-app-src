import { TripsResponse } from "../trips/trips-response"

export class JourneySection {
  public requestXMLText: string
  public response: TripsResponse

  constructor(requestXMLText: string, response: TripsResponse) {
    this.requestXMLText = requestXMLText
    this.response = response
  }
}
