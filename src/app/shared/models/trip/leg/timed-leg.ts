import * as OJP_Types from 'ojp-shared-types';

import { Leg } from "./leg";
import { Duration } from '../../duration';
import { StopPlace } from '../../place/stop-place';
import { JourneyService } from '../../journey-service';
import { StopPointCall } from '../../stop-point-call';
import { SituationContent } from '../../situation';
import { DistanceData, DistanceHelpers } from '../../distance';

export class TimedLeg extends Leg {
  public fromStopCall: StopPointCall;
  public toStopCall: StopPointCall;
  public intermediateStopCalls: StopPointCall[];
  public service: JourneyService;

  public situationsContent: SituationContent[];

  private constructor(id: string, duration: Duration | null, distance: DistanceData, fromStop: StopPointCall, toStop: StopPointCall, intermediateStops: StopPointCall[], service: JourneyService, situationsContent: SituationContent[]) {
    super('TimedLeg', id, duration, distance);
    
    this.fromStopCall = fromStop;
    this.toStopCall = toStop;
    this.intermediateStopCalls = intermediateStops;
    this.service = service;
    
    this.fromPlace = this.fromStopCall.place;
    this.toPlace = this.toStopCall.place;

    this.situationsContent = situationsContent;
  }

  private static computeStopPointCall(callAtStopSchema: OJP_Types.CallAtStopSchema, mapPlaces: Record<string, StopPlace>): StopPointCall {
    const stopRef = callAtStopSchema.stopPointRef;
    const place = mapPlaces[stopRef] ?? null;
    const stopPointCall = StopPointCall.initWithCallAtStopSchema(callAtStopSchema, place);

    return stopPointCall;
  }

  public static initWithLegSchema(legSchema: OJP_Types.LegSchema, mapPlaces: Record<string, StopPlace>, mapSituations: Record<string, SituationContent[]>): TimedLeg | null {
    const id = legSchema.id;
    const duration = Leg.parseDuration(legSchema);

    const timedLegSchema = legSchema.timedLeg as OJP_Types.TimedLegSchema;
    
    const fromStopCall = TimedLeg.computeStopPointCall(timedLegSchema.legBoard, mapPlaces);
    const toStopCall = TimedLeg.computeStopPointCall(timedLegSchema.legAlight, mapPlaces);
    
    const intermediateStopCalls = timedLegSchema.legIntermediate.map(legIntermediateSchema => {
      const intermediateStop = TimedLeg.computeStopPointCall(legIntermediateSchema, mapPlaces);
      return intermediateStop;
    });

    const service = JourneyService.initWithDatedJourneySchema(timedLegSchema.service);

    let situationsContent: SituationContent[] = [];
    service.situationFullRefs?.situationFullRef.forEach(item => {
      if (item.situationNumber in mapSituations) {
        situationsContent = situationsContent.concat(mapSituations[item.situationNumber]);
      }
    });

    const distance = DistanceHelpers.initWithLegSchema(legSchema);

    const timedLeg = new TimedLeg(id, duration, distance, fromStopCall, toStopCall, intermediateStopCalls, service, situationsContent);

    timedLeg.emissionCO2_KgPerPersonKm = legSchema.emissionCO2?.kilogramPerPersonKm ?? null;
    timedLeg.computeLegTrack(timedLegSchema.legTrack?.trackSection ?? [], mapPlaces);

    return timedLeg;
  }

  public mergeWithAnotherTimedLeg(leg2: TimedLeg): TimedLeg {
    let newLegIntermediatePoints = this.intermediateStopCalls.slice();
    newLegIntermediatePoints.push(this.toStopCall);
    newLegIntermediatePoints = newLegIntermediatePoints.concat(leg2.intermediateStopCalls.slice());

    const newDuration: Duration | null = (() => {
      if (!leg2.duration) {
        return null;
      }

      const duration = this.duration?.plus(leg2.duration) ?? null;

      return duration;
    })();

    const newSituations = this.situationsContent.concat(leg2.situationsContent);

    const newDistance = DistanceHelpers.sumDistances(this.distance, leg2.distance);

    const newLeg = new TimedLeg(this.id, newDuration, newDistance, this.fromStopCall, leg2.toStopCall, newLegIntermediatePoints, this.service, newSituations);
    
    if ((this.legTrack.trackSections.length > 0) && (leg2.legTrack.trackSections.length > 0)) {
      newLeg.legTrack = this.legTrack.plus(leg2.legTrack);
    }

    return newLeg;
  }

  public override asOJP_Schema(): OJP_Types.LegSchema {
    const schema: OJP_Types.LegSchema = {
      id: this.id,
      duration: this.duration?.asOjpDurationText() ?? undefined,
      timedLeg: {
        legBoard: this.fromStopCall.asLegBoardSchema(),
        legAlight: this.toStopCall.asLegAlightSchema(),
        legIntermediate: this.intermediateStopCalls.map(el => el.asLegIntermediateSchema()),
        service: this.service,
      },
    };

    if (schema.timedLeg) {
      if (this.legTrack.trackSections.length > 0) {
        schema.timedLeg.legTrack = this.legTrack.asOJP_Schema();
      };
    }

    return schema;
  }

  public override asLegacyOJP_Schema(): OJP_Types.OJPv1_TripLegSchema {
    const schema: OJP_Types.OJPv1_TripLegSchema = {
      legId: this.id,
      duration: this.duration?.asOjpDurationText() ?? undefined,
      timedLeg: {
        legBoard: this.fromStopCall.asLegBoardSchema(),
        legAlight: this.toStopCall.asLegAlightSchema(),
        legIntermediates: this.intermediateStopCalls.map(el => el.asLegIntermediateSchema()),
        service: this.service.asLegacyOJP_Schema(),
      },
    };

    if (schema.timedLeg) {
      if (this.legTrack.trackSections.length > 0) {
        schema.timedLeg.legTrack = this.legTrack.asLegacyOJP_Schema();
      };

      schema.timedLeg.extension = {};

      if (this.service.productCategory?.name) {
        schema.timedLeg.extension.transportTypeName = {
          text: this.service.productCategory?.name.text,
        }
      }
      
      if (this.service.trainNumber !== undefined) {
        schema.timedLeg.extension.publishedJourneyNumber = {
          text: this.service.trainNumber,
        }
      }
    }

    return schema;
  }
}
