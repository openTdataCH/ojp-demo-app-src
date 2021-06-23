import { Duration } from '../types/duration'

export class DateHelpers {
  // 2021-06-03 21:38:04
  public static formatDate(d: Date) {
    const date_parts = [
      d.getFullYear(),
      '-',
      ('00' + (d.getMonth() + 1)).slice(-2),
      '-',
      ('00' + d.getDate()).slice(-2),
      ' ',
      ('00' + d.getHours()).slice(-2),
      ':',
      ('00' + d.getMinutes()).slice(-2),
      ':',
      ('00' + d.getSeconds()).slice(-2)
    ];

    return date_parts.join('');
  }

  // 21:38
  public static formatTimeHHMM(d: Date, separator: string = ':'): string {
    const dateFormatted = DateHelpers.formatDate(d)
    return dateFormatted.substring(11,16);
  }

  public static computeDuration(durationS: string): Duration {
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

    const duration = <Duration>{
        hours: hours,
        minutes: minutes
    }

    return duration
  }

  public static formatDuration(duration: Duration): string {
    const durationParts: string[] = []

    if (duration.hours > 0) {
      durationParts.push(duration.hours + 'hrs')
    }

    durationParts.push(duration.minutes + 'min')

    return durationParts.join('')
  }
}
