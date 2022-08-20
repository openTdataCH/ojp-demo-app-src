import { JourneyService } from '../../journey/journey-service'
import { StopPoint } from './timed-leg/stop-point'
import { LegTrack } from './leg-track'

import { TripLeg, LegType, LinePointData } from "./trip-leg"

import { TripLegPropertiesEnum, TripLegDrawType, TripLegLineType } from "../../types/map-geometry-types";

import { StopPointTime } from './timed-leg/stop-point-time'
import { XPathOJP } from '../../helpers/xpath-ojp'
import { MapLegLineTypeColor } from '../../config/map-colors';

import { GeoPosition } from '../../location/geoposition';
import { Location } from '../../location/location';

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

    const service = JourneyService.initFromContextNode(legNode);
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
    
    timedLeg.legTrack = LegTrack.initFromLegNode(legNode)
    
    // Try to get the duration from LegTrack
    if (timedLeg.legTrack && timedLeg.legDuration === null) {
      timedLeg.legDuration = timedLeg.legTrack.duration
    }

    return timedLeg
  }

  public override patchLocations(mapContextLocations: Record<string, Location>) {
    super.patchLocations(mapContextLocations)

    this.intermediateStopPoints.forEach(stopPoint => {
      this.patchLocation(stopPoint.location, mapContextLocations);
    });
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

  protected override computeSpecificJSONFeatures(): GeoJSON.Feature[] {
    let features: GeoJSON.Feature[] = [];

    const lineType: TripLegLineType = this.service.computeLegLineType()

    const useDetailedTrack = !this.useBeeline()
    if (useDetailedTrack) {
      this.legTrack?.trackSections.forEach(trackSection => {
        const feature = trackSection.linkProjection?.asGeoJSONFeature()
        if (feature?.properties) {
          const drawType: TripLegDrawType = 'LegLine'
          feature.properties[TripLegPropertiesEnum.DrawType] = drawType

          feature.properties[TripLegPropertiesEnum.LineType] = lineType

          features.push(feature);
        }
      });
    }

    return features
  }

  protected override computeLegLineType(): TripLegLineType {
    return this.service.computeLegLineType()
  }

  protected override computeLinePointsData(): LinePointData[] {
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

  public override computeLegColor(): string {
    const defaultColor = super.computeLegColor();

    const timedLegLineType = this.service.computeLegLineType()
    const color = MapLegLineTypeColor[timedLegLineType] ?? defaultColor

    return color
  }

  protected override computeBeelineGeoPositions(): GeoPosition[] {
    const geoPositions: GeoPosition[] = []

    const stopPoints: StopPoint[] = []
    stopPoints.push(this.fromStopPoint)
    this.intermediateStopPoints.forEach(stopPoint => {
      stopPoints.push(stopPoint)
    })
    stopPoints.push(this.toStopPoint)

    stopPoints.forEach(stopPoint => {
      if (stopPoint.location.geoPosition) {
        geoPositions.push(stopPoint.location.geoPosition)
      }
    })

    return geoPositions
  }

  protected override useBeeline(): boolean {
    const usedDetailedLine = this.service.ptMode.hasPrecisePolyline();
    const useBeeline = super.useBeeline() || !usedDetailedLine
    return useBeeline
  }

}
