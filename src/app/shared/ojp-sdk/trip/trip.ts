import { Location } from '../location/location'
import { TripStats } from '../types/trip-stats'
import { TripLeg, TripTimedLeg } from './leg/trip-leg'

import { XPathOJP } from '../helpers/xpath-ojp'
import { DateHelpers } from '../helpers/date-helpers'

export class Trip {
    public id: string
    public legs: TripLeg[]
    public stats: TripStats

    constructor(tripID: string, legs: TripLeg[], tripStats: TripStats) {
        this.id = tripID;
        this.legs = legs;
        this.stats = tripStats
    }

    public static initFromTripResultNode(tripResultNode: Node, contextLocations: Location[]) {
        const tripId = XPathOJP.queryText('ojp:Trip/ojp:TripId', tripResultNode)
        if (tripId === null) {
            return null;
        }

        const durationS = XPathOJP.queryText('ojp:Trip/ojp:Duration', tripResultNode)
        if (durationS === null) {
            return null;
        }

        const distanceS = XPathOJP.queryText('ojp:Trip/ojp:Distance', tripResultNode)
        if (distanceS === null) {
            return null;
        }

        const transfersNoS = XPathOJP.queryText('ojp:Trip/ojp:Transfers', tripResultNode)
        if (transfersNoS === null) {
            return null;
        }

        const tripStats = <TripStats>{
            duration: DateHelpers.computeDuration(durationS),
            distanceMeters: parseInt(distanceS),
            transferNo: parseInt(transfersNoS)
        }

        let legs: TripLeg[] = [];

        const tripResponseLegs = XPathOJP.queryNodes('ojp:Trip/ojp:TripLeg', tripResultNode)
        tripResponseLegs.forEach(tripLegNode => {
            const tripLeg = TripLeg.initFromTripLegFactory(tripLegNode);
            if (tripLeg === null) {
                return
            }

            legs.push(tripLeg);
        })

        const trip = new Trip(tripId, legs, tripStats);

        return trip;
    }

    public computeDepartureTime(): Date | null {
        const timedLegs = this.legs.filter(leg => {
            return leg instanceof TripTimedLeg;
        });

        if (timedLegs.length === 0) {
            console.log('No TimedLeg found for this trip');
            console.log(this);
            return null;
        }

        const firstTimedLeg = timedLegs[0] as TripTimedLeg;
        const stopPointTime = firstTimedLeg.fromEndpoint.departureData;
        const stopPointDate = stopPointTime.estimatedTime ?? stopPointTime.timetabledTime;

        return stopPointDate;
    }

    public computeArrivalTime(): Date | null {
        const timedLegs = this.legs.filter(leg => {
            return leg instanceof TripTimedLeg;
        });

        if (timedLegs.length === 0) {
            console.log('No TimedLeg found for this trip');
            console.log(this);
            return new Date();
        }

        const lastTimedLeg = timedLegs[timedLegs.length - 1] as TripTimedLeg;
        const stopPointTime = lastTimedLeg.toEndpoint.arrivalData;
        const stopPointDate = stopPointTime.estimatedTime ?? stopPointTime.timetabledTime;

        return stopPointDate;
    }

    public computeGeoJSON(): GeoJSON.FeatureCollection {
        let features: GeoJSON.Feature[] = []

        this.legs.forEach(leg => {
            const legFeatures = leg.computeGeoJSONFeatures();
            features = features.concat(legFeatures);
        });

        const geojson: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: features,
        }

        return geojson
    }
}