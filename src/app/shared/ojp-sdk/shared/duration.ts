import { XPathOJP } from "../helpers/xpath-ojp"

export class Duration {
  public hours: number
  public minutes: number
  public totalMinutes: number

  constructor(hours: number, minutes: number) {
    this.hours = hours
    this.minutes = minutes
    this.totalMinutes = hours * 60 + minutes
  }

  public static initFromContextNode(contextNode: Node | null): Duration | null {
    if (contextNode === null) {
      return null
    }

    let durationS = XPathOJP.queryText('ojp:Duration', contextNode)
    if (durationS === null) {
      return null
    }

    // PT4H19M
    durationS = durationS.replace('PT', '');

    let hours = 0
    const hoursMatches = durationS.match(/([0-9]+?)H/);
    if (hoursMatches) {
        hours = parseInt(hoursMatches[1])
    }

    let minutes = 0
    const minutesMatches = durationS.match(/([0-9]+?)M/);
    if (minutesMatches) {
        minutes = parseInt(minutesMatches[1])
    }

    const duration = new Duration(hours, minutes)
    return duration
  }

  public static initFromTotalMinutes(totalMinutes: number): Duration {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes - hours * 60

    const duration = new Duration(hours, minutes)
    return duration
  }

  public formatDuration(): string {
    const durationParts: string[] = []
  
    if (this.hours > 0) {
      durationParts.push(this.hours + 'h ')
    }

    durationParts.push(this.minutes + 'min')

    return durationParts.join('')
  }
}