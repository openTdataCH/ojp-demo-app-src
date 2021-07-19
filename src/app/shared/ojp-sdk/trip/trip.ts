import { XPathOJP } from '../helpers/xpath-ojp'
import { DateHelpers } from '../helpers/date-helpers'

import { TripStats } from '../types/trip-stats'

import { TripLeg } from './leg/trip-leg'
import { TripLegFactory } from './leg/trip-leg-factory'
import { TripTimedLeg } from './leg/trip-timed-leg'
import { TripMotType } from '../types/trip-mot-type'
import { TripContinousLeg } from './leg/trip-continous-leg'
import { Duration } from '../shared/duration'

export class Trip {
  public id: string
  public legs: TripLeg[]
  public stats: TripStats

  constructor(tripID: string, legs: TripLeg[], tripStats: TripStats) {
    this.id = tripID;
    this.legs = legs;
    this.stats = tripStats
  }

  public static initFromTripResultNode(tripResultNode: Node, motType: TripMotType) {
    const tripId = XPathOJP.queryText('ojp:Trip/ojp:TripId', tripResultNode)
    if (tripId === null) {
      return null;
    }

    const tripNode = XPathOJP.queryNode('ojp:Trip', tripResultNode)
    const duration = Duration.initFromContextNode(tripNode)
    if (duration === null) {
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

    const tripStartTimeS = XPathOJP.queryText('ojp:Trip/ojp:StartTime', tripResultNode);
    const tripEndTimeS = XPathOJP.queryText('ojp:Trip/ojp:EndTime', tripResultNode);

    if (tripStartTimeS === null || tripEndTimeS === null) {
      return null;
    }

    const tripStartTime = new Date(Date.parse(tripStartTimeS));
    const tripEndTime = new Date(Date.parse(tripEndTimeS));

    const tripStats = <TripStats>{
      duration: duration,
      distanceMeters: parseInt(distanceS),
      transferNo: parseInt(transfersNoS),
      startDatetime: tripStartTime,
      endDatetime: tripEndTime,
    }

    let legs: TripLeg[] = [];

    const tripResponseLegs = XPathOJP.queryNodes('ojp:Trip/ojp:TripLeg', tripResultNode)
    tripResponseLegs.forEach(tripLegNode => {
      const tripLeg = TripLegFactory.initWithContextNode(tripLegNode);
      if (tripLeg === null) {
        return
      }

      legs.push(tripLeg);
    })

    if (motType === 'Walking') {
      const firstNonWalkingLeg = legs.find(leg => {
        return leg.legType !== 'ContinousLeg'
      })

      if (firstNonWalkingLeg) {
        return null
      }
    }

    if (motType === 'Self-Driving Car') {
      const firstSelfDrivingLeg = legs.find(leg => {
        if (leg.legType === 'ContinousLeg') {
          const continousLeg = leg as TripContinousLeg
          return continousLeg.isSelfDriveCarLeg()
        }

        return false
      })

      if (!firstSelfDrivingLeg) {
        return null
      }
    }

    if (motType === 'Shared Mobility') {
      const firstSharedMobilityLeg = legs.find(leg => {
        if (leg.legType === 'ContinousLeg') {
          const continousLeg = leg as TripContinousLeg
          return continousLeg.isSharedMobility()
        }

        return false
      })

      if (!firstSharedMobilityLeg) {
        return null
      }
    }

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
    const timeData = firstTimedLeg.fromStopPoint.departureData;
    if (timeData === null) {
      return null
    }

    const stopPointDate = timeData.estimatedTime ?? timeData.timetableTime;

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
    const timeData = lastTimedLeg.toStopPoint.arrivalData;
    if (timeData === null) {
      return null
    }

    const stopPointDate = timeData.estimatedTime ?? timeData.timetableTime;

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
