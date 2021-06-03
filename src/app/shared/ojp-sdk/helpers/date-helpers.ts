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
}
