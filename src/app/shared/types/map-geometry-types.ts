import OJP_Legacy from '../../config/ojp-legacy';

export enum TripLegPropertiesEnum {
  LegType = 'leg.type',
  DrawType = 'draw.type',
  PointType = 'point.type',
  LineType = 'line.type',
}

type TripTimedLegLineType =
  | 'LongDistanceRail'
  | 'SBahn'
  | 'Bus'
  | 'PostAuto'
  | 'OnDemand'
  | 'Funicular';
type TripContinousLegLineType =
  | 'Walk'
  | 'Self-Drive Car'
  | 'Shared Mobility'
  | 'Guidance'
  | 'Transfer'
  | 'Water';
export type TripLegLineType =
  | 'Unknown'
  | TripTimedLegLineType
  | TripContinousLegLineType;

export type TripLegDrawType = 'Beeline' | 'LegPoint' | 'LegLine';

export interface MapTripLeg {
  leg: OJP_Legacy.TripLeg,
  forceLinkProjection: boolean,
}

export interface MapTrip {
  legs: MapTripLeg[],
}
