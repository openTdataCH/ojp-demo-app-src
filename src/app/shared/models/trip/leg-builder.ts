import * as OJP_Types from 'ojp-shared-types';

import { ContinuousLeg } from "./leg/continuous-leg";
import { TimedLeg } from "./leg/timed-leg";
import { TransferLeg } from "./leg/transfer-leg";
import { StopPlace } from '../place/stop-place';
import { SituationContent } from '../situation';

export type AnyLeg = ContinuousLeg | TimedLeg | TransferLeg;

export class LegBuilder {
  public static initWithLegSchema(legSchema: OJP_Types.LegSchema, mapPlaces: Record<string, StopPlace>, mapSituations: Record<string, SituationContent[]>): AnyLeg | null {
    if (legSchema.timedLeg) {
      const timedLeg = TimedLeg.initWithLegSchema(legSchema, mapPlaces, mapSituations);
      return timedLeg;
    }

    if (legSchema.transferLeg) {
      const transferLeg = TransferLeg.initWithLegSchema(legSchema, mapPlaces);
      return transferLeg;
    }

    if (legSchema.continuousLeg) {
      const continuousLeg = ContinuousLeg.initWithLegSchema(legSchema, mapPlaces);
      return continuousLeg;
    }

    return null;
  }
}
