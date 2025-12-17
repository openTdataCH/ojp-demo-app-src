import OJP_Legacy from '../../config/ojp-legacy';

export interface TripLegData {
  tripId: string,
  leg: OJP_Legacy.TripLeg,
  info: {
    id: string,
    comments: string | null,
  }
}

export interface TripData {
  trip: OJP_Legacy.Trip,
  legsData: TripLegData[],
  info: {
    comments: string | null,
  }
};
