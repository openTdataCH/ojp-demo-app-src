import { LegType } from "../trip";
import { TripLegLineType } from "../types/map-geometry-types";

export const MapLegTypeColor: Record<LegType, string> = {
  ContinousLeg: '#009933',
  TransferLeg: '#0000ff',
  TimedLeg: '#D04D44',
}
export const MapLegTypes: LegType[] = ['ContinousLeg', 'TimedLeg', 'TransferLeg']

export const MapLegLineTypeColor: Record<TripLegLineType, string> = {
  Unknown: '#ffafcc',
  LongDistanceRail: '#D04D44',
  SBahn: '#3D69CA',
  Bus: '#5F8EF4',
  PostAuto: '#EBBE24',
  OnDemand: '#D77D00',
  Aerial: '#8B4513',
  Funicular: '#006400',
  Walk: '#009933',
  'Self-Drive Car': '#ff004f',
  'Shared Mobility': '#32CD32',
  Guidance: '#6f0000',
  Transfer: '#088F8F',
}
export const MapTripLegLineTypes: TripLegLineType[] = ['LongDistanceRail', 'SBahn', 'Bus', 'PostAuto', 'OnDemand', 'Aerial', 'Walk', 'Guidance', 'Transfer', 'Self-Drive Car', 'Shared Mobility']
