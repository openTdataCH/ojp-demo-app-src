import { JourneyPointType } from '../../types/journey-point-type'
import { StopPointTime } from '../../types/stop-point-time'

import { XPathOJP } from '../../helpers/xpath-ojp'
import { Location } from '../../location/location'

export class LegEndpoint {
  stopPointRef: string
  location: Location
  plannedPlatform: string | null

  constructor(stopPointRef: string, location: Location) {
    this.stopPointRef = stopPointRef
    this.location = location
    this.plannedPlatform = null
  }

  public static initFromTripLeg(timedLegNode: Node, endpointType: JourneyPointType): LegEndpoint | null {
    const isFrom = endpointType == 'From'
    const legNodeDataS = isFrom ? 'ojp:LegBoard' : 'ojp:LegAlight'
    const legEndpointNode = XPathOJP.queryNode(legNodeDataS, timedLegNode);
    if (legEndpointNode === null) {
      return null;
    }

    const stopPointRef = XPathOJP.queryText('siri:StopPointRef', legEndpointNode);
    if (stopPointRef === null) {
      return null;
    }

    const legTimeNodeS = endpointType == 'From' ? 'ojp:ServiceDeparture' : 'ojp:ServiceArrival';
    const legTimeNode = XPathOJP.queryNode(legTimeNodeS, legEndpointNode);
    if (legTimeNode === null) {
      return null;
    }

    const timetableTimeS = XPathOJP.queryText('ojp:TimetabledTime', legTimeNode);
    if (timetableTimeS === null) {
      return null;
    }

    const timetableTime = new Date(Date.parse(timetableTimeS));
    const timetableStopTime = <StopPointTime>{
      timetabledTime: timetableTime
    }

    const estimatedTimeS = XPathOJP.queryText('ojp:EstimatedTime', legTimeNode);
    if (estimatedTimeS) {
      const estimatedTime = new Date(Date.parse(estimatedTimeS));
      timetableStopTime.estimatedTime = estimatedTime;

      const dateDiffSeconds = (estimatedTime.getTime() - timetableTime.getTime()) / 1000;
      timetableStopTime.delayMinutes = Math.floor(dateDiffSeconds / 60);
    }

    const location = Location.initWithOJPContextNode(legEndpointNode)

    let legEndpoint;
    if (isFrom) {
      legEndpoint = new LegFromEndpoint(stopPointRef, timetableStopTime, location);
    } else {
      legEndpoint = new LegToEndpoint(stopPointRef, timetableStopTime, location);
    }

    const plannedQuay = XPathOJP.queryText('ojp:PlannedQuay/ojp:Text', legEndpointNode);
    if (plannedQuay) {
      legEndpoint.plannedPlatform = plannedQuay;
    }

    return legEndpoint;
  }
}

export class LegFromEndpoint extends LegEndpoint {
  departureData: StopPointTime

  constructor(stopPointRef: string, departureData: StopPointTime, location: Location) {
    super(stopPointRef, location)
    this.departureData = departureData
  }
}

export class LegToEndpoint extends LegEndpoint {
  arrivalData: StopPointTime

  constructor(stopPointRef: string, arrivalData: StopPointTime, location: Location) {
    super(stopPointRef, location)
    this.arrivalData = arrivalData
  }
}
