import { XPathOJP } from "../helpers/xpath-ojp";
import { LinkProjection } from "./link-projection";

export class PathGuidance {
    public sections: PathGuidanceSection[];

    constructor(sections: PathGuidanceSection[]) {
        this.sections = sections;
    }

    public static initFromTripLeg(tripLegNode: Node): PathGuidance {
        const sectionNodes = XPathOJP.queryNodes('ojp:PathGuidance/ojp:PathGuidanceSection', tripLegNode);

        let sections: PathGuidanceSection[] = [];

        sectionNodes.forEach((sectionNode, sectionIdx) => {
            const pathGuidanceSection = PathGuidanceSection.initFromSectionNode(sectionNode);
            if (pathGuidanceSection) {
                sections.push(pathGuidanceSection)
            }
        });

        const pathGuidance = new PathGuidance(sections);

        return pathGuidance;
    }
}

class PathGuidanceSection {
    public trackSection: TrackSection | null
    public guidanceAdvice: string | null
    public turnAction: string | null

    constructor() {
        this.trackSection = null
        this.guidanceAdvice = null
        this.turnAction = null
    }

    public static initFromSectionNode(sectionNode: Node): PathGuidanceSection {
        const pathGuidanceSection = new PathGuidanceSection();

        const trackSectionNode = XPathOJP.queryNode('ojp:TrackSection', sectionNode);
        if (trackSectionNode) {
            pathGuidanceSection.trackSection = TrackSection.initFromTrackSectionNode(trackSectionNode);
        }

        pathGuidanceSection.guidanceAdvice = XPathOJP.queryText('ojp:GuidanceAdvice', sectionNode);
        pathGuidanceSection.turnAction = XPathOJP.queryText('ojp:TurnAction', sectionNode);

        return pathGuidanceSection;
    }
}

class TrackSection {
    public linkProjection: LinkProjection | null;
    public roadName: string | null;
    public duration: string | null;
    public length: number | null;

    constructor() {
        this.linkProjection = null;
        this.roadName = null;
        this.duration = null;
        this.length = null;
    }

    public static initFromTrackSectionNode(trackSectionNode: Node): TrackSection {
        const trackSection = new TrackSection();

        trackSection.linkProjection = LinkProjection.initFromTrackSectionNode(trackSectionNode);
        trackSection.roadName = XPathOJP.queryText('ojp:RoadName', trackSectionNode);
        trackSection.duration = XPathOJP.queryText('ojp:Duration', trackSectionNode);

        const lengthS = XPathOJP.queryText('ojp:Length', trackSectionNode);
        if (lengthS) {
            trackSection.length = parseInt(lengthS, 10);
        }

        return trackSection
    }
}



