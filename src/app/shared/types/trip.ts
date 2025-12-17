import OJP_Legacy from '../../config/ojp-legacy';
import { LegShapeResult } from '../services/shape-provider.service';

export interface TripLegData {
  tripId: string,
  leg: OJP_Legacy.TripLeg,
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
  trip: OJP_Legacy.Trip,
  legsData: TripLegData[],
  info: {
    comments: string | null,
  }
};
