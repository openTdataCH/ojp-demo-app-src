import { XPathOJP } from "../../../helpers/xpath-ojp"

export class StopPointTime {
  public timetableTime: Date
  public estimatedTime: Date | null
  public delayMinutes: number | null

  constructor(timetableTime: Date, estimatedTime: Date | null) {
    this.timetableTime = timetableTime
    this.estimatedTime = estimatedTime

    if (estimatedTime) {
      const dateDiffSeconds = (estimatedTime.getTime() - timetableTime.getTime()) / 1000
      this.delayMinutes = Math.floor(dateDiffSeconds / 60)
    } else {
      this.delayMinutes = null
    }
  }

  public static initWithContextNode(contextNode: Node): StopPointTime | null {
    const timetableTimeS = XPathOJP.queryText('ojp:TimetabledTime', contextNode);
    if (timetableTimeS === null) {
      return null;
    }

    const timetableTime = new Date(Date.parse(timetableTimeS));

    let estimatedTime: Date | null = null;
    const estimatedTimeS = XPathOJP.queryText('ojp:EstimatedTime', contextNode);
    if (estimatedTimeS) {
      estimatedTime = new Date(Date.parse(estimatedTimeS));
    }

    const stopPointTime = new StopPointTime(timetableTime, estimatedTime)
    return stopPointTime
  }

}
