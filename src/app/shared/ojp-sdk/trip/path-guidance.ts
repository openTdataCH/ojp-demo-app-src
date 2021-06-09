import mapboxgl from "mapbox-gl";
import { XPathOJP } from "../helpers/xpath-ojp";
import { GeoPosition } from "../location/geoposition";

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

class LinkProjection {
    public coordinates: GeoPosition[];
    public bbox: mapboxgl.LngLatBounds;

    constructor(coordinates: GeoPosition[], bbox: mapboxgl.LngLatBounds) {
        this.coordinates = coordinates;
        this.bbox = bbox;
    }

    public static initFromTrackSectionNode(trackSectionNode: Node): LinkProjection | null {
        const coordinates: GeoPosition[] = [];
        const bbox = new mapboxgl.LngLatBounds();

        const positionNodes = XPathOJP.queryNodes('ojp:LinkProjection/ojp:Position', trackSectionNode);
        positionNodes.forEach(locationNode => {
            const longitudeS = XPathOJP.queryText('siri:Longitude', locationNode);
            const latitudeS = XPathOJP.queryText('siri:Latitude', locationNode);

            if (longitudeS && latitudeS) {
                const position = new GeoPosition(
                    parseFloat(longitudeS),
                    parseFloat(latitudeS),
                )
                coordinates.push(position);
                bbox.extend(position.asLngLat());
            }
        });

        if (coordinates.length < 2) {
            return null;
        }

        const linkProjection = new LinkProjection(coordinates, bbox);
        return linkProjection;
    }

    asGeoJSONFeature(): GeoJSON.Feature<GeoJSON.LineString> {
        const feature: GeoJSON.Feature<GeoJSON.LineString> = {
            type: 'Feature',
            properties: {
                'draw.type': 'guidance'
            },
            geometry: {
                type: 'LineString',
                coordinates: []
            }
        }

        this.coordinates.forEach(geoPosition => {
            const pointCoords = [geoPosition.longitude, geoPosition.latitude];
            feature.geometry.coordinates.push(pointCoords)
        })

        return feature
    }
}

