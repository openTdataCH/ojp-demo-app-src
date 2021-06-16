import { JourneyService } from '../../journey/journey-service'
import { LegEndpoint, LegFromEndpoint, LegToEndpoint } from './leg-endpoint'

import { TripLeg, LegType } from "./trip-leg"

export class TripTimedLeg extends TripLeg {
  public service: JourneyService
  public fromEndpoint: LegFromEndpoint
  public toEndpoint: LegToEndpoint

  constructor(legIDx: number, service: JourneyService, fromEndpoint: LegFromEndpoint, toEndpoint: LegToEndpoint) {
    const legType: LegType = 'TimedLeg'
    super(legType, legIDx, fromEndpoint.location, toEndpoint.location);
    this.service = service;
    this.fromEndpoint = fromEndpoint
    this.toEndpoint = toEndpoint
  }

  public static initFromTripLeg(legIDx: number, legNode: Node | null): TripTimedLeg | null {
    if (legNode === null) {
      return null;
    }

    const service = JourneyService.initFromTripLeg(legNode);
    const fromEndpoint = LegEndpoint.initFromTripLeg(legNode, 'From') as LegFromEndpoint;
    const toEndpoint = LegEndpoint.initFromTripLeg(legNode, 'To') as LegToEndpoint;

    if (service && fromEndpoint && toEndpoint) {
      const tripLeg = new TripTimedLeg(legIDx, service, fromEndpoint, toEndpoint);
      return tripLeg;
    }

    return null;
  }

  public computeDepartureTime(): Date {
    const stopPointTime = this.fromEndpoint.departureData;
    const stopPointDate = stopPointTime.estimatedTime ?? stopPointTime.timetabledTime;
    return stopPointDate
  }

  public computeArrivalTime(): Date {
    const stopPointTime = this.toEndpoint.arrivalData;
    const stopPointDate = stopPointTime.estimatedTime ?? stopPointTime.timetabledTime;
    return stopPointDate
  }
}


