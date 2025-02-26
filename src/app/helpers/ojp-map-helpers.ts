import * as OJP from 'ojp-sdk';

import { TripLegLineType } from '../shared/types/map-geometry-types';

export class OJPMapHelpers {
  public static computeTimedLegColor(leg: OJP.TripTimedLeg): TripLegLineType {
    const isPostAuto = leg.service.agencyCode === '801';
    if (isPostAuto) {
      return 'PostAuto';
    }

    if (leg.service.ptMode.isRail()) {
      return 'LongDistanceRail';
    }

    if (leg.service.ptMode.isDemandMode) {
      return 'OnDemand';
    }

    return 'Bus';
  }
}
