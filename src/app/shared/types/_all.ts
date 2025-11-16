import * as OJP_SharedTypes from 'ojp-shared-types';
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

export interface RasterLayerType {
  id: string,
  caption: string,
  tileURLs: string[],
  minZoom: number,
  maxZoom: number,
  rasterOpacity: number,
  beforeLayerId?: string
};

export interface CreateIssueBody {
  title: string
  description: string
  requestXML: string
  responseXML: string
  projectKey: string
}

export type AnyPlaceSchema = OJP_SharedTypes.PlaceSchema | OJP_SharedTypes.OJPv1_LocationSchema;
export type AnyPlaceResultSchema = OJP_SharedTypes.PlaceResultSchema | OJP_SharedTypes.OJPv1_LocationResultSchema;
export type AnyLocationInformationRequest = OJP_Next.LocationInformationRequest | OJP_Next.OJPv1_LocationInformationRequest;
export type AnyLocationInformationRequestResponse = OJP_Next.LocationInformationRequestResponse | OJP_Next.OJPv1_LocationInformationRequestResponse;
export type AnyTripInfoRequestResponse = OJP_Next.TripInfoRequestResponse | OJP_Next.OJPv1_TripInfoRequestResponse;
export type AnyPointOfInterestSchema = OJP_SharedTypes.PointOfInterestSchema | OJP_SharedTypes.OJPv1_PointOfInterestSchema;
