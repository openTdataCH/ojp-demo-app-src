import { Duration } from '../../types/duration'
import { Location } from '../../location/location'

import { PathGuidance } from '../path-guidance'
import { XPathOJP } from '../../helpers/xpath-ojp'
import { DateHelpers } from '../../helpers/date-helpers'

import { LegTrack } from './leg-track'

import { TripLeg, LegType } from "./trip-leg"

export class TripContinousLeg extends TripLeg {
  public legModeS: string | null
  public legDuration: Duration
  public legDistance: number
  public pathGuidance: PathGuidance | null

  constructor(legType: LegType, legIDx: number, legDuration: Duration, legDistance: number, fromLocation: Location, toLocation: Location) {
    super(legType, legIDx, fromLocation, toLocation)

    this.legModeS = null
    this.legDuration = legDuration
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

    const durationS = XPathOJP.queryText('ojp:Duration', legNode)
    if (durationS === null) {
      return null;
    }

    let distanceS = XPathOJP.queryText('ojp:Length', legNode)
    if (distanceS === null) {
      distanceS = '0';
    }

    const legDuration = DateHelpers.computeDuration(durationS)
    const legDistance = parseInt(distanceS)

    const tripLeg = new TripContinousLeg(legType, legIDx, legDuration, legDistance, fromLocation, toLocation);

    tripLeg.pathGuidance = PathGuidance.initFromTripLeg(legNode);
    tripLeg.legModeS = XPathOJP.queryText('ojp:Service/ojp:IndividualMode', legNode)

    tripLeg.legTrack = LegTrack.initFromLegNode(legNode);

    return tripLeg;
  }

  protected computeSpecificJSONFeatures(): GeoJSON.Feature[] {
    const features: GeoJSON.Feature[] = [];

    this.pathGuidance?.sections.forEach((pathGuidanceSection, guidanceIDx) => {
      const feature = pathGuidanceSection.trackSection?.linkProjection?.asGeoJSONFeature();
      if (feature?.properties) {
        feature.properties['PathGuidanceSection.idx'] = guidanceIDx;
        feature.properties['PathGuidanceSection.TrackSection.RoadName'] = pathGuidanceSection.trackSection?.roadName ?? '';
        feature.properties['PathGuidanceSection.TrackSection.Duration'] = pathGuidanceSection.trackSection?.duration ?? '';
        feature.properties['PathGuidanceSection.TrackSection.Length'] = pathGuidanceSection.trackSection?.length ?? '';
        feature.properties['PathGuidanceSection.GuidanceAdvice'] = pathGuidanceSection.guidanceAdvice ?? '';
        feature.properties['PathGuidanceSection.TurnAction'] = pathGuidanceSection.turnAction ?? '';

        features.push(feature);
      }
    });

    this.legTrack?.trackSections.forEach(trackSection => {
      const feature = trackSection.linkProjection?.asGeoJSONFeature();
      if (feature?.properties) {
          feature.properties['draw.type'] = 'leg-track-section'
          features.push(feature);
      }
    })

    return features;
  }
}
