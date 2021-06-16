import { XPathOJP } from "../../helpers/xpath-ojp";

import { TripContinousLeg } from "./trip-continous-leg";
import { TripTimedLeg } from "./trip-timed-leg";

export class TripLegFactory {
  public static initWithContextNode(contextNode: Node): TripContinousLeg | TripTimedLeg | null {
    const legID_string = XPathOJP.queryText('ojp:LegId', contextNode)
    if (legID_string === null) {
      return null
    }
    const legID = parseInt(legID_string, 10);

    const tripContinousLegNode = XPathOJP.queryNode('ojp:ContinuousLeg', contextNode);
    const tripContinousLeg = TripContinousLeg.initFromTripLeg(legID, tripContinousLegNode, 'ContinousLeg');
    if (tripContinousLeg) {
      return tripContinousLeg;
    }

    const tripTimedLegNode = XPathOJP.queryNode('ojp:TimedLeg', contextNode);
    const tripTimedLeg = TripTimedLeg.initFromTripLeg(legID, tripTimedLegNode);
    if (tripTimedLeg) {
      return tripTimedLeg;
    }

    const transferLegNode = XPathOJP.queryNode('ojp:TransferLeg', contextNode);
    const transferLeg = TripContinousLeg.initFromTripLeg(legID, transferLegNode, 'TransferLeg');
    if (transferLeg) {
      return transferLeg;
    }

    console.log('Cant factory leg #' + legID);
    console.log(contextNode);
    debugger;

    return null;
  }
}
