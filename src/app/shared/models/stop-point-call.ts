import * as OJP_Next from 'ojp-sdk-next';
import * as OJP_Types from 'ojp-shared-types';

import { DEBUG_LEVEL } from '../../config/constants';
import { AnyPlace } from "./place/place-builder";
import { StopEventType } from '../types/_all';
import { StopPlace } from './place/stop-place';
import { LegStopPointData } from '../components/service-stops.component';

// Use a restricted version of OJP_Types.FareClassEnum
type FareClassType = 'firstClass' | 'secondClass';
type MapFareClassOccupancy = Record<FareClassType, OJP_Types.OccupancyLevelEnum | null>;

type VehicleAccessType = 'PLATFORM_ACCESS_WITHOUT_ASSISTANCE' | 'PLATFORM_ACCESS_WITH_ASSISTANCE' | 'PLATFORM_ACCESS_WITH_ASSISTANCE_WHEN_NOTIFIED' | 'PLATFORM_NOT_WHEELCHAIR_ACCESSIBLE' | 'ALTERNATIVE_TRANSPORT' | 'NO_DATA';

interface MapEventPlatformData {
  timetable: string | null,
  realtime: string | null,
};

interface MapEventTimeData {
  timetable: Date | null,
  realtime: Date | null,
  timetableF: string,
  realtimeF: string,
};

export class StopPointHelpers {
  public static computePlatformAssistance(platformText: string | null): VehicleAccessType | null {
    if (platformText === null) {
      return null;
    }

    if (platformText === 'PLATFORM_ACCESS_WITH_ASSISTANCE') {
      return 'PLATFORM_ACCESS_WITH_ASSISTANCE';
    }

    if (platformText === 'PLATFORM_ACCESS_WITH_ASSISTANCE_WHEN_NOTIFIED') {
      return 'PLATFORM_ACCESS_WITH_ASSISTANCE_WHEN_NOTIFIED';
    }

    if (platformText === 'PLATFORM_NOT_WHEELCHAIR_ACCESSIBLE') {
      return 'PLATFORM_NOT_WHEELCHAIR_ACCESSIBLE';
    }

    if (platformText === 'PLATFORM_ACCESS_WITHOUT_ASSISTANCE') {
      return 'PLATFORM_ACCESS_WITHOUT_ASSISTANCE';
    }

    if (platformText === 'NO_DATA') {
      return 'NO_DATA';
    }

    if (platformText === 'ALTERNATIVE_TRANSPORT') {
      return 'ALTERNATIVE_TRANSPORT';
    }

    if (DEBUG_LEVEL === 'DEBUG') {
      console.log('StopPoint.computePlatformAssistance - cant compute platform from text:--' + platformText + '--');
    }

    return null;
  }

  public static computePlatformAssistanceTooltip(vehicleAccessType: VehicleAccessType | null): string {
    const message: string = (() => {
      if (vehicleAccessType === 'PLATFORM_ACCESS_WITHOUT_ASSISTANCE') {
        return 'Step-free access; level entry/exit.';
      }

      if (vehicleAccessType === 'PLATFORM_ACCESS_WITH_ASSISTANCE') {
        return 'Step-free access; entry/exit through staff assistance, no prior registration necessary.';
      }

      if (vehicleAccessType === 'PLATFORM_ACCESS_WITH_ASSISTANCE_WHEN_NOTIFIED') {
        return 'Step-free access; entry/exit through staff assistance, advance registration required.';
      }

      if (vehicleAccessType === 'PLATFORM_NOT_WHEELCHAIR_ACCESSIBLE') {
        return 'Not usable for wheelchairs.';
      }

      if (vehicleAccessType === 'ALTERNATIVE_TRANSPORT') {
        return 'By shuttle from/to the accessible stop, register in advance.';
      }

      return 'No available information about vehicle access.';
    })();

    return message;
  }

  public static computePlatformAssistanceIconPath(vehicleAccessType: VehicleAccessType | null): string | null {
    const filename: string | null = (() => {
      if (vehicleAccessType === 'PLATFORM_ACCESS_WITHOUT_ASSISTANCE') {
        return 'platform_independent';
      }

      if (vehicleAccessType === 'PLATFORM_ACCESS_WITH_ASSISTANCE') {
        return 'platform_help_driver';
      }

      if (vehicleAccessType === 'PLATFORM_ACCESS_WITH_ASSISTANCE_WHEN_NOTIFIED') {
        return 'platform_advance_notice';
      }

      if (vehicleAccessType === 'PLATFORM_NOT_WHEELCHAIR_ACCESSIBLE') {
        return 'platform_not_possible';
      }

      if (vehicleAccessType === 'NO_DATA') {
        return 'platform_no_information';
      }

      if (vehicleAccessType === 'ALTERNATIVE_TRANSPORT') {
        return 'platform_alternative_transport';
      }

      return null;
    })();

    if (filename === null) {
      return null;
    }
    
    const iconPath = 'assets/platform-assistance/' + filename + '.jpg';
    return iconPath;
  }

  private static computeOccupancyLevelIcon(mapFareClassOccupancy: MapFareClassOccupancy | null, fareClassType: FareClassType): string | null {
    if (mapFareClassOccupancy === null) {
      return null;
    }

    const occupancyLevel = mapFareClassOccupancy[fareClassType] ?? null;
    if (occupancyLevel === null) {
      return null;
    }

    if (occupancyLevel === 'unknown') {
      return 'fpl:utilization-none';
    }
    if (occupancyLevel === 'manySeatsAvailable') {
      return 'fpl:utilization-low';
    }
    if (occupancyLevel === 'fewSeatsAvailable') {
      return 'fpl:utilization-medium';
    }
    if (occupancyLevel === 'standingRoomOnly') {
      return 'fpl:utilization-high';
    }
    
    return null;
  }

  private static computeOccupancyLevelText(mapFareClassOccupancy: MapFareClassOccupancy | null, fareClassType: FareClassType): string {
    const defaultText = 'No forecast available';

    if (mapFareClassOccupancy === null) {
      return defaultText;
    }

    const occupancyLevel = mapFareClassOccupancy[fareClassType] ?? null;
    if (occupancyLevel === null) {
      return defaultText;
    }
    
    if (occupancyLevel === 'manySeatsAvailable') {
      return 'Low occupancy';
    }
    if (occupancyLevel === 'fewSeatsAvailable') {
      return 'Medium occupancy';
    }
    if (occupancyLevel === 'standingRoomOnly') {
      return 'High occupancy';
    }

    return defaultText;
  }

  public static updateLocationDataWithTime(stopPointData: LegStopPointData, stopPoint: StopPointCall) {
    const depArrTypes: StopEventType[] = ['arrival', 'departure'];

    depArrTypes.forEach(depArrType => {
      const isArr = depArrType === 'arrival';
      if (isArr) {
        stopPointData.arrText = stopPoint.arrival.timetableF;
      } else {
        stopPointData.depText = stopPoint.departure.timetableF;
      }

      const delayText = StopPointHelpers.computeStopPointDelayText(depArrType, stopPoint);
      if (delayText !== null) {
        if (isArr) {
          stopPointData.arrDelayText = delayText;
        } else {
          stopPointData.depDelayText = delayText;
        }
      }
    });

    stopPointData.platformText = stopPoint.platform.timetable;
    stopPointData.actualPlatformText = stopPoint.platform.realtime;

    // Dont propagate changes if the platform didnt change
    if (stopPointData.actualPlatformText !== null && (stopPointData.platformText === stopPointData.actualPlatformText)) {
      stopPointData.actualPlatformText = null;
    }

    stopPointData.geoPosition = stopPoint.place?.geoPosition ?? null;

    stopPointData.isNotServicedStop = stopPoint.isNotServicedStop === true;

    stopPointData.occupancy = {
      firstClassIcon: StopPointHelpers.computeOccupancyLevelIcon(stopPoint.mapFareClassOccupancy, 'firstClass'),
      firstClassText: StopPointHelpers.computeOccupancyLevelText(stopPoint.mapFareClassOccupancy, 'firstClass'),
      secondClassIcon: StopPointHelpers.computeOccupancyLevelIcon(stopPoint.mapFareClassOccupancy, 'secondClass'),
      secondClassText: StopPointHelpers.computeOccupancyLevelText(stopPoint.mapFareClassOccupancy, 'secondClass'),
    };

    stopPointData.geoPosition = stopPointData.geoPosition;
  }

  public static computeDelayMinutes(depArrType: StopEventType, stopPoint: StopPointCall): number | null {
    const isArr = depArrType === 'arrival';
    const depArrTime = isArr ? stopPoint.arrival : stopPoint.departure;

    if ((depArrTime.timetable === null) || (depArrTime.realtime === null)) {
      return null;
    }

    const dateDiffSeconds = (depArrTime.realtime.getTime() - depArrTime.timetable.getTime()) / 1000
    const delayMinutes = Math.floor(dateDiffSeconds / 60)

    return delayMinutes;
  }
  
  private static computeStopPointDelayText(depArrType: StopEventType, stopPoint: StopPointCall): string | null {
    const isArr = depArrType === 'arrival';
    const depArrTime = isArr ? stopPoint.arrival : stopPoint.departure;

    if ((depArrTime.timetable === null) || (depArrTime.realtime === null)) {
      return null;
    }
      
    const dateDiffSeconds = (depArrTime.realtime.getTime() - depArrTime.timetable.getTime()) / 1000;
    if (Math.abs(dateDiffSeconds) < 0.1) {
      return null;
    }

    const delayTextParts: string[] = [];
    delayTextParts.push(' ');
    
    if (dateDiffSeconds > 0) {
      delayTextParts.push('+');
    }

    const absDateDiffSeconds = Math.abs(dateDiffSeconds);

    if (DEBUG_LEVEL === 'DEBUG') {
      // On DEV show full minutes:seconds delays
      const dateDiffMinutes = Math.floor(absDateDiffSeconds / 60);
      if (dateDiffMinutes) {
        delayTextParts.push('' + dateDiffMinutes);
        delayTextParts.push("'");
      }

      const dateDiffSecondsRemaining = absDateDiffSeconds - dateDiffMinutes * 60;
      delayTextParts.push('' + dateDiffSecondsRemaining);
      delayTextParts.push("\"");
    } else {
      // On PROD show just minutes
      const delayMinutes = Math.floor(dateDiffSeconds / 60);
      if (delayMinutes === 0) {
        return null;
      }
        
      delayTextParts.push('' + delayMinutes)
      delayTextParts.push("'");
    }

    const delayText = delayTextParts.join('');

    return delayText;
  }
}

type LegBoardSchema = Omit<OJP_Types.CallAtStopSchema, 'serviceDeparture'> & Required<Pick<OJP_Types.CallAtStopSchema, 'serviceDeparture'>>;
type LegAlightSchema = Omit<OJP_Types.CallAtStopSchema, 'serviceArrival'> & Required<Pick<OJP_Types.CallAtStopSchema, 'serviceArrival'>>;
type LegIntermediateSchema = Omit<OJP_Types.CallAtStopSchema, 'serviceArrival' | 'serviceDeparture'> & Required<Pick<OJP_Types.CallAtStopSchema, 'serviceArrival' | 'serviceDeparture'>>;

export class StopPointCall {
  public place: AnyPlace | null;
  
  public stopPointRef: string;
  public stopPointName: string;

  public arrival: MapEventTimeData;
  public departure: MapEventTimeData;

  public order: number | null;

  public platform: MapEventPlatformData;
  
  public nameSuffix: string | null;
  public vehicleAccessType: VehicleAccessType | null;
  
  public isRequestStop: boolean | null;
  public isUnplannedStop: boolean | null;
  public isNotServicedStop: boolean | null;
  public isNoBoardingAtStop: boolean | null;
  public isNoAlightingAtStop: boolean | null;

  public mapFareClassOccupancy: MapFareClassOccupancy | null;

  private constructor(stopPointRef: string, stopPointName: string) {
    this.place = null;

    this.stopPointRef = stopPointRef;
    this.stopPointName = stopPointName;

    this.arrival = {
      timetable: null,
      realtime: null,
      timetableF: '',
      realtimeF: '',
    };

    this.departure = {
      timetable: null,
      realtime: null,
      timetableF: '',
      realtimeF: '',
    };

    this.order = null;

    this.platform = {
      timetable: null,
      realtime: null,
    };

    this.nameSuffix = null;
    this.vehicleAccessType = null;
    
    this.isRequestStop = null;
    this.isUnplannedStop = null;
    this.isNotServicedStop = null;
    this.isNoBoardingAtStop = null;
    this.isNoAlightingAtStop = null;

    this.mapFareClassOccupancy = null;
  }

  public static initWithCallAtStopSchema(callAtStopSchema: OJP_Types.CallAtStopSchema, place: StopPlace | null): StopPointCall {
    const stopCall = new StopPointCall(callAtStopSchema.stopPointRef, callAtStopSchema.stopPointName.text);

    stopCall.place = place;

    stopCall.arrival = {
      timetable: null,
      realtime: null,
      timetableF: '',
      realtimeF: '',
    };
    stopCall.departure = {
      timetable: null,
      realtime: null,
      timetableF: '',
      realtimeF: '',
    };
    const stopEventTypes: StopEventType[] = ['arrival', 'departure'];
    stopEventTypes.forEach(stopEventType => {
      const isArrival = stopEventType === 'arrival';
      const sourceStopEvent = (isArrival ? callAtStopSchema.serviceArrival : callAtStopSchema.serviceDeparture) ?? null;

      const timetableDateSrc = sourceStopEvent?.timetabledTime ?? null;
      const timetableDate = timetableDateSrc ? new Date(Date.parse(timetableDateSrc)) : null;
      const timetableDateF = timetableDate ? OJP_Next.DateHelpers.formatTimeHHMM(timetableDate) : '';

      const realtimeDateSrc = sourceStopEvent?.estimatedTime ?? null;
      const realtimeDate = realtimeDateSrc ? new Date(Date.parse(realtimeDateSrc)) : null;
      const realtimeDateF = realtimeDate ? OJP_Next.DateHelpers.formatTimeHHMM(realtimeDate) : '';

      if (isArrival) {
        stopCall.arrival.timetable = timetableDate;
        stopCall.arrival.timetableF = timetableDateF;
        stopCall.arrival.realtime = realtimeDate;
        stopCall.arrival.realtimeF = realtimeDateF;
      } else {
        stopCall.departure.timetable = timetableDate;
        stopCall.departure.timetableF = timetableDateF;
        stopCall.departure.realtime = realtimeDate;
        stopCall.departure.realtimeF = realtimeDateF;
      }
    });

    stopCall.order = callAtStopSchema.order ?? null;

    stopCall.platform = {
      timetable: callAtStopSchema.plannedQuay?.text ?? null,
      realtime: callAtStopSchema.plannedQuay?.text ?? null,
    };

    stopCall.nameSuffix = callAtStopSchema.nameSuffix?.text ?? null;
    stopCall.vehicleAccessType = StopPointHelpers.computePlatformAssistance(stopCall.nameSuffix);
    
    stopCall.isRequestStop = (callAtStopSchema.requestStop === undefined) ? null : callAtStopSchema.requestStop;
    stopCall.isUnplannedStop = (callAtStopSchema.unplannedStop === undefined) ? null : callAtStopSchema.unplannedStop;
    stopCall.isNotServicedStop = (callAtStopSchema.notServicedStop === undefined) ? null : callAtStopSchema.notServicedStop;
    stopCall.isNoBoardingAtStop = (callAtStopSchema.noBoardingAtStop === undefined) ? null : callAtStopSchema.noBoardingAtStop;
    stopCall.isNoAlightingAtStop = (callAtStopSchema.noAlightingAtStop === undefined) ? null : callAtStopSchema.noAlightingAtStop;

    stopCall.mapFareClassOccupancy = (() => {
      const mapFare: MapFareClassOccupancy = {
        firstClass: null,
        secondClass: null,
      };

      callAtStopSchema.expectedDepartureOccupancy?.forEach(occupancySchema => {
        const level = occupancySchema.occupancyLevel;

        if (occupancySchema.fareClass === 'firstClass') {
          mapFare.firstClass = level;
        }
        if (occupancySchema.fareClass === 'secondClass') {
          mapFare.secondClass = level;
        }
      });

      return mapFare;
    })();

    return stopCall;
  }

  private depArrAsOJP_Schema(mapEventTimeData: MapEventTimeData): OJP_Types.ServiceArrivalDepartureSchema {
    const timeTableDate = mapEventTimeData.timetable ?? new Date();
    
    const schema: OJP_Types.ServiceArrivalDepartureSchema = {
      timetabledTime: timeTableDate.toISOString(),
    };
    if (mapEventTimeData.realtime) {
      schema.estimatedTime = mapEventTimeData.realtime.toISOString();
    }

    return schema;
  }
  
  // no need to have it public for now, only variations like LegBoardSchema needs it
  private asOJP_Schema(): OJP_Types.CallAtStopSchema {
    const schema: OJP_Types.CallAtStopSchema = {
      stopPointRef: this.stopPointRef,
      stopPointName: {
        text: this.stopPointName,
      },
    };
    
    if (this.nameSuffix !== null) {
      schema.nameSuffix = {
        text: this.nameSuffix,
      };
    }
    
    if (this.platform.timetable !== null) {
      schema.plannedQuay = {
        text: this.platform.timetable,
      };
    }
    if (this.platform.realtime !== null) {
      schema.estimatedQuay = {
        text: this.platform.realtime,
      };
    }
    if (this.arrival.timetable !== null) {
      schema.serviceArrival = this.depArrAsOJP_Schema(this.arrival);
    }
    if (this.departure.timetable !== null) {
      schema.serviceDeparture = this.depArrAsOJP_Schema(this.departure);
    }
    
    if (this.order !== null) {
      schema.order = this.order;
    }

    schema.expectedDepartureOccupancy = (() => {
      const classOcupancyData: OJP_Types.ExpectedDepartureOccupancySchema[] = [];

      if (this.mapFareClassOccupancy === null) {
        return [];
      }

      const fareClassLevels: FareClassType[] = ['firstClass', 'secondClass'];
      fareClassLevels.forEach(fareClassLevel => {
        const classLevel = (this.mapFareClassOccupancy as any)[fareClassLevel] as OJP_Types.OccupancyLevelEnum;

        const occupancyData: OJP_Types.ExpectedDepartureOccupancySchema = {
          fareClass: fareClassLevel,
          occupancyLevel: classLevel,
        };
        classOcupancyData.push(occupancyData);
      });

      return classOcupancyData;
    })();

    return schema;
  }

  public asLegBoardSchema(): LegBoardSchema {
    const stopCallSchema = this.asOJP_Schema();

    const schema: LegBoardSchema = Object.assign({}, stopCallSchema,
      {
        serviceDeparture: this.depArrAsOJP_Schema(this.departure),
      }
    );

    return schema;
  }

  public asLegAlightSchema(): LegAlightSchema {
    const stopCallSchema = this.asOJP_Schema();

    const schema: LegAlightSchema = Object.assign({}, stopCallSchema,
      {
        serviceArrival: this.depArrAsOJP_Schema(this.arrival),
      }
    );

    return schema;
  }

  public asLegIntermediateSchema(): LegIntermediateSchema {
    const stopCallSchema = this.asOJP_Schema();

    const schema: LegIntermediateSchema = Object.assign({}, stopCallSchema,
      {
        serviceArrival: this.depArrAsOJP_Schema(this.arrival),
        serviceDeparture: this.depArrAsOJP_Schema(this.departure),
      }
    );

    return schema;
  }
}
