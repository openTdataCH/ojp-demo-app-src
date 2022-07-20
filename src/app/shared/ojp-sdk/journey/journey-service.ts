import { PublicTransportMode } from './public-transport-mode'
import { TripLegLineType } from "../types/map-geometry-types";

import { XPathOJP } from '../helpers/xpath-ojp'
import { StopPlace } from '../location/stopplace';

export class JourneyService {
  public journeyRef: string;
  public ptMode: PublicTransportMode;
  public agencyID: string;
  public originStopPlace: StopPlace;
  public destinationStopPlace: StopPlace;
  public serviceLineNumber: string | null
  public journeyNumber: string | null

  constructor(journeyRef: string, ptMode: PublicTransportMode, agencyID: string, originStopPlace: StopPlace, destinationStopPlace: StopPlace) {
    this.journeyRef = journeyRef;
    this.ptMode = ptMode;
    this.agencyID = agencyID;
    this.originStopPlace = originStopPlace;
    this.destinationStopPlace = destinationStopPlace;

    this.serviceLineNumber = null;
    this.journeyNumber = null;
  }

  public static initFromContextNode(contextNode: Node): JourneyService | null {
    const serviceNode = XPathOJP.queryNode('ojp:Service', contextNode)
    if (serviceNode === null) {
      return null;
    }

    const journeyRef = XPathOJP.queryText('ojp:JourneyRef', serviceNode);
    const ptMode = PublicTransportMode.initFromServiceNode(serviceNode)

    const ojpAgencyId = XPathOJP.queryText('ojp:OperatorRef', serviceNode);
    const agencyID = ojpAgencyId?.replace('ojp:', '');

    const originStopPlace = StopPlace.initFromServiceNode(serviceNode, 'Origin');
    const destinationStopPlace = StopPlace.initFromServiceNode(serviceNode, 'Destination');
    
    if (!(journeyRef && ptMode && agencyID && originStopPlace && destinationStopPlace)) {
      return null
    }

    const legService = new JourneyService(journeyRef, ptMode, agencyID, originStopPlace, destinationStopPlace);

    legService.serviceLineNumber = XPathOJP.queryText('ojp:PublishedLineName/ojp:Text', serviceNode);
    legService.journeyNumber = XPathOJP.queryText('ojp:Extension/ojp:PublishedJourneyNumber/ojp:Text', contextNode);

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

    if (this.ptMode.isDemandMode) {
      return 'OnDemand'
    }

    return 'Bus'
  }

  public formatServiceName(): string {
    if (this.ptMode.isDemandMode) {
      return this.serviceLineNumber ?? 'OnDemand';
    }

    const nameParts: string[] = []

    if (this.serviceLineNumber) {
      if (!this.ptMode.isRail()) {
        nameParts.push(this.ptMode.shortName ?? this.ptMode.ptMode)
      }

      nameParts.push(this.serviceLineNumber)
      nameParts.push(this.journeyNumber ?? '')
    } else {
      nameParts.push(this.ptMode.shortName ?? this.ptMode.ptMode)
    }

    nameParts.push('(' + this.agencyID + ')')

    return nameParts.join(' ')
  }
}
