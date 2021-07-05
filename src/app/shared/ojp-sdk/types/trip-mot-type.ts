export type TripMotType = 'Default' | 'Walking' | 'Self-Driving Car' | 'Shared Mobility'
enum TripMotTypeKey {
  'Default' = 'default',
  'Walking' = 'walk',
  'Self-Driving Car' = 'self-drive-car',
}

export const TripMotTypes: TripMotType[] = ['Default', 'Walking', 'Self-Driving Car', 'Shared Mobility']

export class TripMotTypeHelpers {
  public static MotTypeFromQueryString(param: string | null): TripMotType {
    if (param === TripMotTypeKey["Self-Driving Car"]) {
      return 'Self-Driving Car'
    }

    if (param === TripMotTypeKey.Walking) {
      return 'Walking'
    }

    return 'Default'
  }

  public static MotTypeKey(motType: TripMotType): string {
    if (motType === 'Self-Driving Car') {
      return TripMotTypeKey["Self-Driving Car"]
    }

    if (motType === 'Walking') {
      return TripMotTypeKey.Walking
    }

    return TripMotTypeKey.Default
  }
}
