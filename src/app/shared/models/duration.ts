export class Duration {
  public hours: number;
  public minutes: number;
  public totalMinutes: number;
  public durationText: string;

  private constructor(hours: number, minutes: number) {
    this.hours = hours;
    this.minutes = minutes;
    this.totalMinutes = hours * 60 + minutes;
    this.durationText = this.asOjpDurationText();
  }

  public static initWithDurationSchema(durationS: string | undefined): Duration | null {
    if (durationS === undefined) {
      return null;
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

    const duration = new Duration(hours, minutes);
    return duration;
  }

  public asOjpDurationText(): string {
    const parts: string[] = [];

    parts.push('PT');
    if (this.hours > 0) {
      parts.push('' + this.hours + 'H');
    }
    parts.push('' + this.minutes + 'M');

    return parts.join('');
  }

  public static initFromTotalMinutes(totalMinutes: number): Duration {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes - hours * 60;

    const duration = new Duration(hours, minutes);
    return duration;
  }

  public plus(otherDuration: Duration): Duration {
    return Duration.initFromTotalMinutes(this.totalMinutes + otherDuration.totalMinutes)
  }

  public format(): string {
    const durationParts: string[] = [];
  
    if (this.hours > 0) {
      durationParts.push(this.hours + 'h ');
    }

    durationParts.push(this.minutes + 'min');

    const durationS = durationParts.join('');

    return durationS;
  }
}
