import { Location } from '../../location/location'

import { PathGuidance } from '../path-guidance'
import { XPathOJP } from '../../helpers/xpath-ojp'

import { LegTrack } from './leg-track'

import { TripLeg, LegType, LinePointData } from "./trip-leg"
import { TripLegPropertiesEnum, TripLegDrawType, TripLegLineType } from '../../types/map-geometry-types'
import { MapLegLineTypeColor } from '../../config/map-colors'
import { Duration } from '../../shared/duration'

enum ContinousLegMode {
  'Unknown' = 'unknown',
  'Walk' = 'walk',
  'Self-Drive Car' = 'self-drive-car',
  'Shared Mobility' = 'shared-mobility',
}

export class TripContinousLeg extends TripLeg {
  public legMode: ContinousLegMode | null
  public legDistance: number
  public pathGuidance: PathGuidance | null

  constructor(legType: LegType, legIDx: number, legDistance: number, fromLocation: Location, toLocation: Location) {
    super(legType, legIDx, fromLocation, toLocation)

    this.legMode = null
    this.legDistance = legDistance
    this.pathGuidance = null
  }

  public static initFromTripLeg(legIDx: number, legNode: Node | null, legType: LegType): TripContinousLeg | null {
    if (legNode === null) {
      return null;
    }

    const fromLocationNode = XPathOJP.queryNode('ojp:LegStart', legNode)
    const toLocationNode = XPathOJP.queryNode('ojp:LegEnd', legNode)
    if (fromLocationNode === null || toLocationNode === null) {
      return null
    }

    const fromLocation = Location.initWithOJPContextNode(fromLocationNode)
    const toLocation = Location.initWithOJPContextNode(toLocationNode)

    let distanceS = XPathOJP.queryText('ojp:Length', legNode)
    if (distanceS === null) {
      distanceS = '0';
    }
    const legDistance = parseInt(distanceS)

    const tripLeg = new TripContinousLeg(legType, legIDx, legDistance, fromLocation, toLocation);
    tripLeg.legDuration = Duration.initFromContextNode(legNode)

    tripLeg.pathGuidance = PathGuidance.initFromTripLeg(legNode);
    tripLeg.legMode = tripLeg.computeLegMode(legNode)

    tripLeg.legTrack = LegTrack.initFromLegNode(legNode);

    return tripLeg;
  }

  private computeLegMode(legNode: Node): ContinousLegMode | null {
    const legModeS = XPathOJP.queryText('ojp:Service/ojp:IndividualMode', legNode)
    if (legModeS === null) {
      return null
    }

    if (legModeS === 'walk') {
      return ContinousLegMode.Walk
    }

    if (legModeS === 'self-drive-car') {
      return ContinousLegMode['Self-Drive Car']
    }

    if (legModeS === 'cycle') {
      return ContinousLegMode['Shared Mobility']
    }

    return null
  }

  public isSelfDriveCarLeg(): boolean {
    return this.legMode === ContinousLegMode['Self-Drive Car']
  }

  public isSharedMobility(): boolean {
    return this.legMode === ContinousLegMode['Shared Mobility']
  }

  protected computeSpecificJSONFeatures(): GeoJSON.Feature[] {
    const features: GeoJSON.Feature[] = [];

    this.pathGuidance?.sections.forEach((pathGuidanceSection, guidanceIDx) => {
      const feature = pathGuidanceSection.trackSection?.linkProjection?.asGeoJSONFeature();
      if (feature?.properties) {
        const drawType: TripLegDrawType = 'LegLine'
        feature.properties[TripLegPropertiesEnum.DrawType] = drawType

        const lineType: TripLegLineType = 'Guidance'
        feature.properties[TripLegPropertiesEnum.LineType] = lineType

        feature.properties['PathGuidanceSection.idx'] = guidanceIDx;
        feature.properties['PathGuidanceSection.TrackSection.RoadName'] = pathGuidanceSection.trackSection?.roadName ?? '';
        feature.properties['PathGuidanceSection.TrackSection.Duration'] = pathGuidanceSection.trackSection?.duration ?? '';
        feature.properties['PathGuidanceSection.TrackSection.Length'] = pathGuidanceSection.trackSection?.length ?? '';
        feature.properties['PathGuidanceSection.GuidanceAdvice'] = pathGuidanceSection.guidanceAdvice ?? '';
        feature.properties['PathGuidanceSection.TurnAction'] = pathGuidanceSection.turnAction ?? '';

        // TODO - dont show guidances for now
        // features.push(feature);
      }
    });

    this.legTrack?.trackSections.forEach(trackSection => {
      const feature = trackSection.linkProjection?.asGeoJSONFeature()
      if (feature?.properties) {
        const drawType: TripLegDrawType = 'LegLine'
        feature.properties[TripLegPropertiesEnum.DrawType] = drawType

        feature.properties[TripLegPropertiesEnum.LineType] = this.computeLegLineType()

        features.push(feature);
      }
    });

    return features;
  }

  protected computeLegLineType(): TripLegLineType {
    if (this.legType === 'ContinousLeg') {
      if (this.isSelfDriveCarLeg()) {
        return 'Self-Drive Car'
      }

      if (this.isSharedMobility()) {
        return 'Shared Mobility'
      }
    }

    if (this.legType === 'TransferLeg') {
      return 'Transfer'
    }

    return 'Walk'
  }

  protected computeLinePointsData(): LinePointData[] {
    // Don't show endpoints for TransferLeg
    if (this.legType === 'TransferLeg') {
      return []
    }

    const pointsData = super.computeLinePointsData()

    return pointsData;
  }

  public computeLegColor(): string {
    if (this.isSelfDriveCarLeg()) {
      return MapLegLineTypeColor['Self-Drive Car']
    }

    if (this.isSharedMobility()) {
      return MapLegLineTypeColor['Shared Mobility']
    }

    if (this.legType === 'TransferLeg') {
      return MapLegLineTypeColor.Transfer
    }

    return MapLegLineTypeColor.Walk
  }
}
