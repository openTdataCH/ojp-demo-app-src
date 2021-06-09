import { Duration } from '../../types/duration'
import { Location } from '../../location/location'

import { JourneyService } from '../../journey/journey-service'
import { LegEndpoint, LegFromEndpoint, LegToEndpoint } from './leg-endpoint'
import { LegTrack } from './leg-track'

import { DateHelpers } from '../../helpers/date-helpers'
import { XPathOJP } from '../../helpers/xpath-ojp'
import { PathGuidance } from '../path-guidance'

type LegType = 'ContinousLeg' | 'TimedLeg' | 'TransferLeg'

export class TripLeg {
  public legType: LegType
  public legID: number
  public fromLocation: Location
  public toLocation: Location
  public legTrack: LegTrack | null

  constructor(legType: LegType, legIDx: number, fromLocation: Location, toLocation: Location) {
    this.legType = legType
    this.legID = legIDx
    this.fromLocation = fromLocation
    this.toLocation = toLocation
    this.legTrack = null
  }

  public static initFromTripLegFactory(tripLegNode: Node) {
    const legID_string = XPathOJP.queryText('ojp:LegId', tripLegNode)
    if (legID_string === null) {
      return null
    }
    const legID = parseInt(legID_string, 10);

    const tripContinousLegNode = XPathOJP.queryNode('ojp:ContinuousLeg', tripLegNode);
    const tripContinousLeg = TripContinousLeg.initFromTripLeg(legID, tripContinousLegNode);
    if (tripContinousLeg) {
      return tripContinousLeg;
    }

    const tripTimedLegNode = XPathOJP.queryNode('ojp:TimedLeg', tripLegNode);
    const tripTimedLeg = TripTimedLeg.initFromTripLeg(legID, tripTimedLegNode);
    if (tripTimedLeg) {
      return tripTimedLeg;
    }

    const transferLegNode = XPathOJP.queryNode('ojp:TransferLeg', tripLegNode);
    const transferLeg = TripTransferLeg.initFromTripLeg(legID, transferLegNode);
    if (transferLeg) {
      return transferLeg;
    }

    console.log('Cant factory leg #' + legID);
    console.log(tripLegNode);
    debugger;

    return null;
  }

  public computeGeoJSONFeatures(): GeoJSON.Feature[] {
    let features: GeoJSON.Feature[] = [];

    const legBeelineFeature: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature',
      properties: {
        'draw.type': 'leg-beeline',
      },
      geometry: {
        type: 'LineString',
        coordinates: []
      }
    };

    [this.fromLocation, this.toLocation].forEach(endpointLocation => {
      const locationFeature = endpointLocation.asGeoJSONFeature();
      if (locationFeature?.properties) {
        const isFrom = endpointLocation === this.fromLocation;

        locationFeature.properties['endpoint.type'] = isFrom ? 'from' : 'to'
        locationFeature.properties['draw.type'] = 'endpoint';

        features.push(locationFeature);

        legBeelineFeature.geometry.coordinates.push(locationFeature.geometry.coordinates);
      }
    });

    if (legBeelineFeature.geometry.coordinates.length > 1) {
      features.push(legBeelineFeature);
    }

    features = features.concat(this.computeSpecificJSONFeatures());

    features.forEach(feature => {
      if (feature.properties) {
        if (feature.properties['draw.type'] === null) {
          debugger;
        }

        feature.properties['leg.idx'] = this.legID - 1;
        feature.properties['leg.type'] = this.computeLegType();
      }
    });

    return features;
}

  private computeLegType(): string {
    if (this.legType == 'TimedLeg') {
      return 'TimedLeg'
    }

    if (this.legType == 'TransferLeg') {
      return 'TransferLeg'
    }

    if (this.legType == 'ContinousLeg') {
      return 'ContinousLeg'
    }

    debugger;
    return 'n/a';
  }

  protected computeSpecificJSONFeatures(): GeoJSON.Feature[] {
    const features: GeoJSON.Feature[] = [];
    return features;
  }
}

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

  public static initFromTripLeg(legIDx: number, legNode: Node | null, isContinousLeg: boolean = true): TripContinousLeg | null {
    if (legNode === null) {
      return null;
    }

    const fromLocationNode = XPathOJP.queryNode('ojp:LegStart', legNode)
    const toLocationNode = XPathOJP.queryNode('ojp:LegEnd', legNode)
    if (fromLocationNode === null || toLocationNode === null) {
      return null
    }

    const fromLocation = new Location(fromLocationNode)
    const toLocation = new Location(toLocationNode)

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

    let tripLeg;
    if (isContinousLeg) {
      const legType: LegType = 'ContinousLeg'
      tripLeg = new TripContinousLeg(legType, legIDx, legDuration, legDistance, fromLocation, toLocation);
    } else {
      const legType: LegType = 'TransferLeg'
      tripLeg = new TripTransferLeg(legType, legIDx, legDuration, legDistance, fromLocation, toLocation);
    }

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

    return features;
  }
}

export class TripTimedLeg extends TripLeg {
  public service: JourneyService
  public fromEndpoint: LegFromEndpoint
  public toEndpoint: LegToEndpoint

  constructor(legIDx: number, service: JourneyService, fromEndpoint: LegFromEndpoint, toEndpoint: LegToEndpoint) {
    const legType: LegType = 'TimedLeg'
    super(legType, legIDx, fromEndpoint.location, toEndpoint.location);
    this.service = service;
    this.fromEndpoint = fromEndpoint
    this.toEndpoint = toEndpoint
  }

  public static initFromTripLeg(legIDx: number, legNode: Node | null): TripTimedLeg | null {
    if (legNode === null) {
      return null;
    }

    const service = JourneyService.initFromTripLeg(legNode);
    const fromEndpoint = LegEndpoint.initFromTripLeg(legNode, 'From') as LegFromEndpoint;
    const toEndpoint = LegEndpoint.initFromTripLeg(legNode, 'To') as LegToEndpoint;

    if (service && fromEndpoint && toEndpoint) {
      const tripLeg = new TripTimedLeg(legIDx, service, fromEndpoint, toEndpoint);
      return tripLeg;
    }

    return null;
  }

  public computeDepartureTime(): Date {
    const stopPointTime = this.fromEndpoint.departureData;
    const stopPointDate = stopPointTime.estimatedTime ?? stopPointTime.timetabledTime;
    return stopPointDate
  }

  public computeArrivalTime(): Date {
    const stopPointTime = this.toEndpoint.arrivalData;
    const stopPointDate = stopPointTime.estimatedTime ?? stopPointTime.timetabledTime;
    return stopPointDate
  }
}

export class TripTransferLeg extends TripContinousLeg {
  public static initFromTripLeg(legIDx: number, legNode: Node | null): TripTransferLeg | null {
    const isContinousLeg = false;
    return TripContinousLeg.initFromTripLeg(legIDx, legNode, isContinousLeg);
  }
}
