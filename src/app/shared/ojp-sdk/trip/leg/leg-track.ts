import { XPathOJP } from "../../helpers/xpath-ojp"
import { Location } from "../../location/location"
import { LinkProjection } from "../link-projection";

export class LegTrack {
  public trackSections: TrackSection[]
  public hasGeoData: boolean

  constructor(trackSections: TrackSection[]) {
    this.trackSections = trackSections;

    this.hasGeoData = false
    trackSections.forEach(trackSection => {
      if (trackSection.linkProjection) {
        this.hasGeoData = true
      }
    })
  }

  public static initFromLegNode(contextNode: Node): LegTrack | null {
    const legTrackNode = XPathOJP.queryNode('ojp:LegTrack', contextNode)
    if (legTrackNode === null) {
      return null;
    }

    let trackSections: TrackSection[] = []

    const trackSectionNodes = XPathOJP.queryNodes('ojp:TrackSection', legTrackNode);
    trackSectionNodes.forEach(trackSectionNode => {
      const trackSection = TrackSection.initFromContextNode(trackSectionNode);
      if (trackSection) {
        trackSections.push(trackSection);
      }
    })

    const legTrack = new LegTrack(trackSections);

    return legTrack
  }
}

class TrackSection {
  public fromLocation: Location
  public toLocation: Location
  public durationS: string | null
  public length: number | null
  public linkProjection: LinkProjection | null;

  constructor(fromLocation: Location, toLocation: Location) {
    this.fromLocation = fromLocation
    this.toLocation = toLocation
    this.durationS = null
    this.length = null
    this.linkProjection = null
  }

  public static initFromContextNode(contextNode: Node): TrackSection | null {
    const trackStartNode = XPathOJP.queryNode('ojp:TrackStart', contextNode);
    const trackEndNode = XPathOJP.queryNode('ojp:TrackEnd', contextNode);

    if (trackStartNode === null || trackEndNode === null) {
      return null;
    }

    const fromLocation = Location.initWithOJPContextNode(trackStartNode)
    const toLocation = Location.initWithOJPContextNode(trackEndNode)

    const trackSection = new TrackSection(fromLocation, toLocation);
    trackSection.durationS = XPathOJP.queryText('ojp:Duration', contextNode);

    const lengthS = XPathOJP.queryText('ojp:Length', contextNode);
    if (lengthS) {
      trackSection.length = parseInt(lengthS, 10);
    }

    trackSection.linkProjection = LinkProjection.initFromTrackSectionNode(contextNode);

    return trackSection
  }
}
