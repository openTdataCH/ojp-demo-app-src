import * as OJP_Next from 'ojp-sdk-next';
import OJP_Legacy from '../../config/ojp-legacy';

export type StopEventType = 'arrival' | 'departure';
export type VehicleAccessType = 'PLATFORM_ACCESS_WITHOUT_ASSISTANCE' | 'PLATFORM_ACCESS_WITH_ASSISTANCE' | 'PLATFORM_ACCESS_WITH_ASSISTANCE_WHEN_NOTIFIED' | 'PLATFORM_NOT_WHEELCHAIR_ACCESSIBLE' | 'ALTERNATIVE_TRANSPORT' | 'NO_DATA';
export type StopPointCallType = 'From' | 'To' | 'Intermediate';

interface MapEventPlatformData {
  timetable: string | null,
  realtime: string | null,
};

export interface MapEventTimeData {
  timetable: Date | null,
  realtime: Date | null,
  timetableF: string,
  realtimeF: string,
};

export interface StopPointCall {
  type: StopPointCallType,
  place: OJP_Next.Place | null,
  stopPointRef: string,
  stopPointName: string,
  platform: MapEventPlatformData,
  arrival: MapEventTimeData,
  departure: MapEventTimeData,
  vehicleAccessType: VehicleAccessType | null,
  mapFareClassOccupancy: OJP_Legacy.MapFareClassOccupancy | null,
  isNotServicedStop: boolean | null,
};
