import * as OJP_Types from 'ojp-shared-types';

import { StopPointCall } from '../types/_all';
import { OJPHelpers } from '../../helpers/ojp-helpers';
import { JourneyService } from './journey-service';
import { StopPlace } from './place/stop-place';
import { SituationContent } from './situation';

export class StopEventResult {
  public prevCalls: StopPointCall[];
  public thisCall: StopPointCall;
  public nextCalls: StopPointCall[];
  public service: JourneyService;
  
  // technically this should be under StopPointCall / Service 
  //    but since we show only current stop situations
  //    => then we add it here
  public situationsContent: SituationContent[];

  private constructor(prevCalls: StopPointCall[], thisCall: StopPointCall, nextCalls: StopPointCall[], service: JourneyService, situationsContent: SituationContent[]) {
    this.prevCalls = prevCalls;
    this.thisCall = thisCall;
    this.nextCalls = nextCalls;
    this.service = service;
    this.situationsContent = situationsContent;
  }

  private static computeStopCalls(callsAtStopSchema: OJP_Types.CallAtStopSchema[], mapPlaces: Record<string, StopPlace>): StopPointCall[] {
    const calls: StopPointCall[] = [];
    callsAtStopSchema.forEach((callAtStopSchema, idx) => {
      const stopRef = callAtStopSchema.stopPointRef;
      const place = mapPlaces[stopRef] ?? null;

      const stopCall = OJPHelpers.createStopPointCall(callAtStopSchema, place);
      calls.push(stopCall);
    });

    return calls;
  }

  public static initWithStopEventResultSchema(resultSchema: OJP_Types.StopEventResultSchema, mapPlaces: Record<string, StopPlace>, mapSituations: Record<string, SituationContent[]>): StopEventResult | null {
    const prevStopCalls = StopEventResult.computeStopCalls(resultSchema.stopEvent.previousCall.map(el => el.callAtStop), mapPlaces);
    const thisStopCall = StopEventResult.computeStopCalls([resultSchema.stopEvent.thisCall.callAtStop], mapPlaces)[0];
    const nextStopCalls = StopEventResult.computeStopCalls(resultSchema.stopEvent.onwardCall.map(el => el.callAtStop), mapPlaces);

    const serviceSchema = resultSchema.stopEvent.service;
    if (!serviceSchema) {
      return null;
    }

    const service = JourneyService.initWithDatedJourneySchema(serviceSchema);

    let situationsContent: SituationContent[] = [];
    service.situationFullRefs?.situationFullRef.forEach(item => {
      if (item.situationNumber in mapSituations) {
        situationsContent = situationsContent.concat(mapSituations[item.situationNumber]);
      }
    });

    const stopEventResult = new StopEventResult(prevStopCalls, thisStopCall, nextStopCalls, service, situationsContent);
    
    return stopEventResult;
  }
}
