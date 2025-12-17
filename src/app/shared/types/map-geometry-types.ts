export enum TripLegPropertiesEnum {
  LegType = 'leg.type',           // Continous, Transfer, Timed
  DrawType = 'draw.type',         // see below TripLegDrawType
  
  PointType = 'point.type',       // From, To, Intermediate
  LineType = 'line.type',         // see below TripTimedLegLineType
  
  LineColor = 'leg-type.color',   // color literal
}

type TripTimedLegLineType =
  | 'LongDistanceRail'
  | 'SBahn'
  | 'Subway'
  | 'CogRailway'
  | 'Bus'
  | 'PostAuto'
  | 'OnDemand'
  | 'Funicular'
  | 'Tram';
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

export type TripLegDrawType = 'Beeline' | 'WalkLine' | 'LegLine';
