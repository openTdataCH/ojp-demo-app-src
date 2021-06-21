import { PublicTransportMode } from './public-transport-mode'
import { TripLegLineType } from "../types/map-geometry-types";

import { XPathOJP } from '../helpers/xpath-ojp'

export class JourneyService {
  public journeyRef: string;
  public ptMode: PublicTransportMode;
  public agencyID: string;
  public serviceLineNumber: string | null
  public journeyNumber: string | null

  constructor(journeyRef: string, ptMode: PublicTransportMode, agencyID: string) {
    this.journeyRef = journeyRef;
    this.ptMode = ptMode;
    this.agencyID = agencyID;
    this.serviceLineNumber = null;
    this.journeyNumber = null;
  }

  public static initFromTripLeg(tripLegNode: Node): JourneyService | null {
    const serviceNode = XPathOJP.queryNode('ojp:Service', tripLegNode)
    if (serviceNode === null) {
      return null;
    }

    const journeyRef = XPathOJP.queryText('ojp:JourneyRef', serviceNode);
    const ptMode = PublicTransportMode.initFromServiceNode(serviceNode)

    const ojpAgencyId = XPathOJP.queryText('ojp:OperatorRef', serviceNode);
    const agencyID = ojpAgencyId?.replace('ojp:', '');

    if (!(journeyRef && ptMode && agencyID)) {
      return null
    }

    const legService = new JourneyService(journeyRef, ptMode, agencyID);

    legService.serviceLineNumber = XPathOJP.queryText('ojp:PublishedLineName/ojp:Text', serviceNode);
    legService.journeyNumber = XPathOJP.queryText('ojp:Extension/ojp:PublishedJourneyNumber/ojp:Text', tripLegNode);

    return legService
  }

  public computeLegLineType(): TripLegLineType {
    const isPostAuto = this.agencyID === '801'
    if (isPostAuto) {
      return 'PostAuto'
    }

    if (this.ptMode.isRail()) {
      return 'LongDistanceRail'
    }

    return 'Bus'
  }
}
