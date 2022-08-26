export type TripMotType = 'Default' | 'Walking' | 'Self-Driving Car' | 'Shared Mobility'
enum TripMotTypeKey {
  'Default' = 'default',
  'Walking' = 'walk',
  'Self-Driving Car' = 'self-drive-car',
  'Shared Mobility' = 'shared-mobility',
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

    if (param === TripMotTypeKey["Shared Mobility"]) {
      return 'Shared Mobility'
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

    if (motType === 'Shared Mobility') {
      return TripMotTypeKey["Shared Mobility"]
    }

    return TripMotTypeKey.Default
  }
}
export type TripModeType = 'monomodal' | 'mode_at_start' | 'mode_at_end' | 'mode_at_start_end'
