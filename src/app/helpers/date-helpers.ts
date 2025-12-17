export class DateHelpers {
  public static computeExecutionTime(
    date1: Date | null,
    date2: Date | null
  ): number {
    if (date1 === null || date2 === null) {
      return 0;
    }

    const durationSeconds = (date2.getTime() - date1.getTime()) / 1000;
    return durationSeconds;
  }

  public static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
