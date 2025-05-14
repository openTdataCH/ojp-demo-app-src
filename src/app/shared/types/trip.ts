import OJP_Legacy from '../../config/ojp-legacy';
import * as OJP_Types from 'ojp-shared-types';

export interface TripLegData {
  leg: OJP_Legacy.TripLeg,
  info: {
    id: string,
    comments: string | null,
  }
}

export interface TripData {
  trip: OJP_Legacy.Trip,
  fareResult: OJP_Types.FareResultSchema | null,
  legsData: TripLegData[],
  info: {
    comments: string | null,
  }
};
