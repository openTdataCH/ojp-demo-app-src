export class FormatHelpers {
  public static parseNumber(value: any): number | null {
    const parsedValue = parseFloat(value);
    return isNaN(parsedValue) ? null : parsedValue;
  }
}
