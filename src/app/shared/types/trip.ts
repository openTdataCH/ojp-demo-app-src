import { AnyLeg } from '../models/trip/leg-builder';
import { Trip } from '../models/trip/trip';
import { LegShapeResult } from '../services/shape-provider.service';

export interface TripLegData {
  tripId: string,
  leg: AnyLeg,
  info: {
    id: string,
    comments: string | null,
  },
  map: {
    show: boolean,
    showPreciseLine: boolean,
    showOtherProvider: boolean,
    legShapeResult: LegShapeResult | null,
    legShapeError: string | null,
  }
}

export interface TripData {
  trip: Trip,
  legsData: TripLegData[],
  info: {
    comments: string | null,
  }
};
