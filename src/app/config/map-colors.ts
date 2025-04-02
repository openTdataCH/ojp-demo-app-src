import * as OJP from 'ojp-sdk-v1';

import { TripLegLineType } from '../shared/types/map-geometry-types'

export const MapLegTypeColor: Record<OJP.LegType, string> = {
  ContinousLeg: '#009933',
  TransferLeg: '#0000ff',
  TimedLeg: '#D04D44',
}
export const MapLegTypes: OJP.LegType[] = ['ContinousLeg', 'TimedLeg', 'TransferLeg']

export const MapLegLineTypeColor: Record<TripLegLineType, string> = {
  Unknown: '#ffafcc',
  LongDistanceRail: '#D04D44',
  SBahn: '#0d6efd',
  Bus: '#0d6efd',
  PostAuto: '#EBBE24',
  OnDemand: '#D77D00',
  Aerial: '#8B4513',
  Funicular: '#006400',
  Walk: '#009933',
  'Self-Drive Car': '#ff004f',
  'Shared Mobility': '#32CD32',
  Guidance: '#6f0000',
  Transfer: '#088F8F',
  'Water': '#005AB3',
}
export const MapTripLegLineTypes: TripLegLineType[] = ['LongDistanceRail', 'SBahn', 'Bus', 'PostAuto', 'OnDemand', 'Aerial', 'Walk', 'Guidance', 'Transfer', 'Self-Drive Car', 'Shared Mobility', 'Water']
