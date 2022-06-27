import { XPathOJP } from "../../../helpers/xpath-ojp"
import { Location } from "../../../location/location"
import { StopPointTime } from "./stop-point-time"
import { StopPointType } from "../../../types/stop-point-type"

export class StopPoint {
  public stopPointType: StopPointType
  public location: Location
  public arrivalData: StopPointTime | null
  public departureData: StopPointTime | null
  public plannedPlatform: string | null
  public sequenceOrder: number | null

  constructor(
    stopPointType: StopPointType, 
    location: Location, arrivalData: StopPointTime | null, 
    departureData: StopPointTime | null, 
    plannedPlatform: string | null, 
    sequenceOrder: number | null
  ) {
    this.stopPointType = stopPointType 
    this.location = location
    this.arrivalData = arrivalData
    this.departureData = departureData
    this.plannedPlatform = plannedPlatform
    this.sequenceOrder =  sequenceOrder
  }

  public static initWithContextNode(stopPointType: StopPointType, contextNode: Node): StopPoint | null {
    const stopPointRef = XPathOJP.queryText('siri:StopPointRef', contextNode);
    if (stopPointRef === null) {
      return null;
    }

    const location = Location.initWithOJPContextNode(contextNode)

    const arrivalData = StopPoint.computeStopPointTime('ServiceArrival', contextNode)
    const departureData = StopPoint.computeStopPointTime('ServiceDeparture', contextNode)
    const plannedPlatform = XPathOJP.queryText('ojp:PlannedQuay/ojp:Text', contextNode)
    
    const sequenceOrderS = XPathOJP.queryText('ojp:Order', contextNode)
    const sequenceOrder = sequenceOrderS === null ? null : parseInt(sequenceOrderS, 10);

    const stopPoint = new StopPoint(stopPointType, location, arrivalData, departureData, plannedPlatform, sequenceOrder)
    return stopPoint
  }

  public static computeStopPointTime(stopTimeType: string, contextNode: Node): StopPointTime | null {
    const stopTimeNodeName = 'ojp:' + stopTimeType;
    const stopTimeNode = XPathOJP.queryNode(stopTimeNodeName, contextNode);
    if (stopTimeNode === null) {
      return null
    }

    const stopTime = StopPointTime.initWithContextNode(stopTimeNode)
    return stopTime
  }
}
