import { JourneyService } from '../../journey/journey-service'
import { StopPoint } from './timed-leg/stop-point'
import { LegTrack } from './leg-track'

import { TripLeg, LegType, LinePointData } from "./trip-leg"

import { TripLegPropertiesEnum, TripLegDrawType, TripLegLineType } from "../../types/map-geometry-types";
import { StopPointType } from '../../types/stop-point-type';

import { StopPointTime } from './timed-leg/stop-point-time'
import { XPathOJP } from '../../helpers/xpath-ojp'
import { MapLegLineTypeColor } from '../../config/map-colors';

export class TripTimedLeg extends TripLeg {
  public service: JourneyService

  public fromStopPoint: StopPoint
  public toStopPoint: StopPoint
  public intermediateStopPoints: StopPoint[]

  constructor(
    legIDx: number,
    service: JourneyService,
    fromStopPoint: StopPoint,
    toStopPoint: StopPoint,
    intermediateStopPoints: StopPoint[] = []
  ) {
    const legType: LegType = 'TimedLeg'
    super(legType, legIDx, fromStopPoint.location, toStopPoint.location);
    this.service = service
    this.fromStopPoint = fromStopPoint
    this.toStopPoint = toStopPoint
    this.intermediateStopPoints = intermediateStopPoints
  }

  public static initFromTripLeg(legIDx: number, legNode: Node | null): TripTimedLeg | null {
    if (legNode === null) {
      return null;
    }

    const service = JourneyService.initFromTripLeg(legNode);
    if (service === null) {
      return null
    }

    const fromStopNode = XPathOJP.queryNode('ojp:LegBoard', legNode);
    const toStopNode = XPathOJP.queryNode('ojp:LegAlight', legNode);
    if (fromStopNode === null || toStopNode === null) {
      return null
    }

    const fromStopPoint = StopPoint.initWithContextNode('From', fromStopNode)
    const toStopPoint = StopPoint.initWithContextNode('To', toStopNode)
    if (fromStopPoint === null || toStopPoint === null) {
      return null
    }

    const intermediateStopPoints: StopPoint[] = []
    const intermediaryStopNodes: Node[] = XPathOJP.queryNodes('ojp:LegIntermediates', legNode) ?? [];
    intermediaryStopNodes.forEach(stopNode => {
      const stopPoint = StopPoint.initWithContextNode('Intermediate', stopNode)
      if (stopPoint) {
        intermediateStopPoints.push(stopPoint)
      }
    })

    const timedLeg = new TripTimedLeg(legIDx, service, fromStopPoint, toStopPoint, intermediateStopPoints);

    timedLeg.legTrack = LegTrack.initFromLegNode(legNode);

    return timedLeg
  }

  public computeDepartureTime(): Date | null {
    return this.computeStopPointTime(this.fromStopPoint.departureData)
  }

  public computeArrivalTime(): Date | null {
    return this.computeStopPointTime(this.toStopPoint.arrivalData)
  }

  private computeStopPointTime(timeData: StopPointTime | null): Date | null {
    if (timeData === null) {
      return null
    }

    const stopPointDate = timeData.estimatedTime ?? timeData.timetableTime;
    return stopPointDate
  }

  protected computeSpecificJSONFeatures(): GeoJSON.Feature[] {
    let features: GeoJSON.Feature[] = [];

    const lineType: TripLegLineType = this.service.computeLegLineType()

    this.legTrack?.trackSections.forEach(trackSection => {
      const feature = trackSection.linkProjection?.asGeoJSONFeature()
      if (feature?.properties) {
        const drawType: TripLegDrawType = 'LegLine'
        feature.properties[TripLegPropertiesEnum.DrawType] = drawType

        feature.properties[TripLegPropertiesEnum.LineType] = lineType

        features.push(feature);
      }
    });

    return features
  }

  protected computeLegLineType(): TripLegLineType {
    return this.service.computeLegLineType()
  }

  protected computeLinePointsData(): LinePointData[] {
    const linePointsData = super.computeLinePointsData()

    // Intermediate points
    this.intermediateStopPoints.forEach(stopPoint => {
      const locationFeature = stopPoint.location.asGeoJSONFeature();
      if (locationFeature?.properties) {
        linePointsData.push({
          type: 'Intermediate',
          feature: locationFeature
        })
      }
    });

    return linePointsData
  }

  public computeLegColor(): string {
    const defaultColor = super.computeLegColor();

    const timedLegLineType = this.service.computeLegLineType()
    const color = MapLegLineTypeColor[timedLegLineType] ?? defaultColor

    return color
  }

}
