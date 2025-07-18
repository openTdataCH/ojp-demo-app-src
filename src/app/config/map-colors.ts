import { TripLegLineType } from '../shared/types/map-geometry-types';

export const MapLegLineTypeColor: Record<TripLegLineType, string> = {
  Unknown: '#ffafcc',
  LongDistanceRail: '#D04D44',
  SBahn: '#0d6efd',
  Bus: '#0d6efd',
  PostAuto: '#EBBE24',
  OnDemand: '#D77D00',
  Funicular: '#8B4513',
  Walk: '#009933',
  'Self-Drive Car': '#ff004f',
  'Shared Mobility': '#871282',
  Guidance: '#6f0000',
  Transfer: '#088F8F',
  Water: '#005AB3',
}
