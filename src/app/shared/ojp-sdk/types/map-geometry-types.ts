export enum TripLegPropertiesEnum {
  LegType = 'leg.type',
  DrawType = 'draw.type',
  PointType = 'point.type',
  LineType = 'line.type'
}

type TripTimedLegLineType = 'LongDistanceRail' | 'SBahn' | 'Bus' | 'PostAuto' | 'OnDemand' | 'Aerial' | 'Funicular'
type TripContinousLegLineType = 'Walk' | 'Guidance' | 'Transfer'
export type TripLegLineType = 'Unknown' | TripTimedLegLineType | TripContinousLegLineType

export type TripLegDrawType = 'Beeline' | 'LegPoint' | 'LegLine'
