import OJP_Legacy from '../config/ojp-legacy';

import { TripLegLineType } from '../shared/types/map-geometry-types';

export class OJPMapHelpers {
  public static computeTimedLegColor(leg: OJP_Legacy.TripTimedLeg): TripLegLineType {
    const isPostAuto = leg.service.operatorRef === '801';
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
