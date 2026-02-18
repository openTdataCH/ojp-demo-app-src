import * as OJP from 'ojp-sdk';
import * as OJP_Types from 'ojp-shared-types';

import { AnyTripResultSchema, JourneyPointType } from '../../types/_all';

import { Duration } from '../duration';
import { DistanceData } from '../distance';
import { AnyLeg, LegBuilder } from './leg-builder';
import { StopPlace } from '../place/stop-place';
import { JourneyService } from '../journey-service';
import { TimedLeg } from './leg/timed-leg';
import { SituationContent } from '../situation';

interface TripRealTimeData {
  unplanned?: boolean
  cancelled?: boolean
  deviation?: boolean
  delayed?: boolean
  infeasible?: boolean
}

export class Trip {
  public id: string;
  
  public duration: Duration;
  public distance: DistanceData;
  
  public transfers: number;
  
  public startDateTime: Date;
  public endDateTime: Date;
  
  public legs: AnyLeg[];

  public realTimeData: TripRealTimeData;

  private constructor(id: string, duration: Duration, distance: DistanceData, startDateTime: Date, endDateTime: Date, transfers: number, legs: AnyLeg[]) {
    this.id = id;

    this.duration = duration;
    this.distance = distance;

    this.transfers = transfers;
    
    this.startDateTime = startDateTime;
    this.endDateTime = endDateTime;
    
    this.legs = legs;

    this.realTimeData = {
      unplanned: undefined,
      cancelled: undefined,
      deviation: undefined,
      delayed: undefined,
      infeasible: undefined,
    };
  }

  public static initWithTripSchema(tripSchema: OJP_Types.TripSchema, mapPlaces: Record<string, StopPlace>, mapSituations: Record<string, SituationContent[]>): Trip | null {
    const duration = Duration.initWithDurationSchema(tripSchema.duration);
    if (duration === null) {
      console.error('Trip.initWithTripSchema cant have empty duration');
      console.log(tripSchema);
      return null;
    }

    const startDateTime = new Date(tripSchema.startTime);
    const endDateTime = new Date(tripSchema.endTime);

    const legs: AnyLeg[] = [];
    tripSchema.leg.forEach(legSchema => {
      const leg = LegBuilder.initWithLegSchema(legSchema, mapPlaces, mapSituations);
      if (leg) {
        legs.push(leg);
        
        if ((leg.fromPlace === null) || (leg.toPlace === null)) {
          console.log('Trip.initWithTripSchema - leg without fromPlace/toPlace detected');
          console.log(legSchema);
          console.log(leg);
        }
      }
    });

    const distance: DistanceData = (() => {
      const tripDistance: DistanceData = {
        distanceM: 0,
        source: '0.unknown',
      };

      if (tripSchema.distance !== undefined) {
        tripDistance.distanceM = tripSchema.distance;
        tripDistance.source = '1a.trip.distance';

        return tripDistance;
      }

      tripDistance.source = '1b.trip.legs-sum';
      legs.forEach(leg => {
        tripDistance.distanceM += leg.distance.distanceM;
      });

      return tripDistance;
    })();

    const trip = new Trip(tripSchema.id, duration, distance, startDateTime, endDateTime, tripSchema.transfers, legs);

    trip.realTimeData = {
      unplanned: tripSchema.unplanned,
      cancelled: tripSchema.cancelled,
      deviation: tripSchema.deviation,
      delayed: tripSchema.delayed,
      infeasible: tripSchema.infeasible,
    };

    return trip;
  }

  public static initWithTripLegacySchema(legacyTripSchema: OJP_Types.OJPv1_TripSchema, mapPlaces: Record<string, StopPlace>, mapSituations: Record<string, SituationContent[]>): Trip | null {
    const legs: OJP_Types.LegSchema[] = [];
    legacyTripSchema.tripLeg.forEach(legacyTripLeg => {
      const leg: OJP_Types.LegSchema = {
        id: legacyTripLeg.legId,
        duration: legacyTripLeg.duration,
      };
      
      if (legacyTripLeg.continuousLeg) {
        const legStart: OJP_Types.PlaceRefSchema = {
          stopPointRef: legacyTripLeg.continuousLeg.legStart.stopPointRef,
          stopPlaceRef: legacyTripLeg.continuousLeg.legStart.stopPlaceRef,
          geoPosition: legacyTripLeg.continuousLeg.legStart.geoPosition,
          name: legacyTripLeg.continuousLeg.legStart.locationName,
        };
        const legEnd: OJP_Types.PlaceRefSchema = {
          stopPointRef: legacyTripLeg.continuousLeg.legEnd.stopPointRef,
          stopPlaceRef: legacyTripLeg.continuousLeg.legEnd.stopPlaceRef,
          geoPosition: legacyTripLeg.continuousLeg.legEnd.geoPosition,
          name: legacyTripLeg.continuousLeg.legEnd.locationName,
        };

        const continuousLegService: OJP_Types.ContinuousServiceSchema = {
          personalModeOfOperation: 'own',
          personalMode: 'foot'
        };

        if (legacyTripLeg.continuousLeg.service.individualMode === 'self-drive-car') {
          continuousLegService.personalMode = 'car';
        }

        leg.continuousLeg = {
          legStart: legStart,
          legEnd: legEnd,
          service: continuousLegService,
          duration: legacyTripLeg.continuousLeg.duration,
          length: legacyTripLeg.continuousLeg.length,
          legTrack: legacyTripLeg.continuousLeg.legTrack,
          pathGuidance: legacyTripLeg.continuousLeg.pathGuidance,
        };
      }

      if (legacyTripLeg.timedLeg) {
        leg.timedLeg = {
          legBoard: legacyTripLeg.timedLeg.legBoard,
          legIntermediate: legacyTripLeg.timedLeg.legIntermediates,
          legAlight: legacyTripLeg.timedLeg.legAlight,
          service: JourneyService.initWithLegacyTripTimedLegSchema(legacyTripLeg.timedLeg),
          legTrack: legacyTripLeg.timedLeg.legTrack,
        };
      }

      if (legacyTripLeg.transferLeg) {
        const legStart: OJP_Types.PlaceRefSchema = {
          stopPointRef: legacyTripLeg.transferLeg.legStart.stopPointRef,
          stopPlaceRef: legacyTripLeg.transferLeg.legStart.stopPlaceRef,
          geoPosition: legacyTripLeg.transferLeg.legStart.geoPosition,
          name: legacyTripLeg.transferLeg.legStart.locationName,
        };
        const legEnd: OJP_Types.PlaceRefSchema = {
          stopPointRef: legacyTripLeg.transferLeg.legEnd.stopPointRef,
          stopPlaceRef: legacyTripLeg.transferLeg.legEnd.stopPlaceRef,
          geoPosition: legacyTripLeg.transferLeg.legEnd.geoPosition,
          name: legacyTripLeg.transferLeg.legEnd.locationName,
        };

        leg.transferLeg = {
          transferType: legacyTripLeg.transferLeg.transferType,
          legStart: legStart,
          legEnd: legEnd,
          duration: legacyTripLeg.transferLeg.duration,
          length: legacyTripLeg.transferLeg.length,
          pathGuidance: legacyTripLeg.transferLeg.pathGuidance,
        };
      }

      legs.push(leg);
    });

    const tripSchema: OJP_Types.TripSchema = {
      id: legacyTripSchema.tripId,
      duration: legacyTripSchema.duration,
      startTime: legacyTripSchema.startTime,
      endTime: legacyTripSchema.endTime,
      transfers: legacyTripSchema.transfers,
      leg: legs,
    };

    const trip = Trip.initWithTripSchema(tripSchema, mapPlaces, mapSituations);

    return trip;
  }

  public static initWithTripResultSchema(version: OJP.OJP_VERSION, tripResultSchema: AnyTripResultSchema, mapPlaces: Record<string, StopPlace>, mapSituations: Record<string, SituationContent[]>): Trip | null {
    if (version === '2.0') {
      const tripSchema = (tripResultSchema.trip as OJP_Types.TripSchema);
      return Trip.initWithTripSchema(tripSchema, mapPlaces, mapSituations);
    } else {
      const tripSchema = (tripResultSchema.trip as OJP_Types.OJPv1_TripSchema);
      return Trip.initWithTripLegacySchema(tripSchema, mapPlaces, mapSituations);
    }
  }
  
  public computeTimedLegDepartureTime(): Date | null {
    const timedLegs = this.legs.filter(leg => {
      return leg instanceof TimedLeg;
    });

    if (timedLegs.length === 0) {
      return null;
    }

    const firstTimedLeg = timedLegs[0] as TimedLeg;
    const timeData = firstTimedLeg.fromStopCall.departure;
    if (timeData === null) {
      return null;
    }

    const stopPointDate = timeData.realtime ?? timeData.timetable;

    return stopPointDate;
  }

  public asOJP_Schema(): OJP_Types.TripSchema {
    const tripSchema: OJP_Types.TripSchema = {
      id: this.id,
      duration: this.duration.asOjpDurationText(),
      startTime: this.startDateTime.toISOString(),
      endTime: this.endDateTime.toISOString(),
      transfers: this.transfers,
      leg: [],
    };

    this.legs.forEach(leg => {
      const legSchema = leg.asOJP_Schema();
      tripSchema.leg.push(legSchema);
    });

    return tripSchema;
  }

  public asLegacyOJP_Schema(): OJP_Types.OJPv1_TripSchema {
    const tripSchema: OJP_Types.OJPv1_TripSchema = {
      tripId: this.id,
      duration: this.duration.asOjpDurationText(),
      startTime: this.startDateTime.toISOString(),
      endTime: this.endDateTime.toISOString(),
      transfers: this.transfers,
      tripLeg: [],
    };

    this.legs.forEach(leg => {
      const legacyLegSchema = leg.asLegacyOJP_Schema();
      tripSchema.tripLeg.push(legacyLegSchema);
    });

    return tripSchema;
  }

  public computeTripHash(): string {
    const endpointTypes: JourneyPointType[] = ['From', 'To'];

    const hashParts: string[] = [];

    this.legs.forEach((leg, idx) => {
      const legHash = leg.type + idx;
      hashParts.push(legHash);

      const durationHash = leg.duration?.asOjpDurationText() ?? 'duration_na';
      hashParts.push(durationHash);

      if (leg.type === 'TimedLeg') {
        const timedLeg = leg as TimedLeg;
        const serviceHash = timedLeg.service.formatServiceName();
        hashParts.push(serviceHash);

        endpointTypes.forEach(endpointType => {
          const isFrom = endpointType === 'From';

          const endpointTimeDateF = isFrom ? timedLeg.fromStopCall.departure.timetableF : timedLeg.toStopCall.arrival.timetableF;
          hashParts.push(endpointTimeDateF);
        });
      }
    });

    const tripHash = hashParts.join('_');

    return tripHash;
  }
}
