import * as OJP_Types from 'ojp-shared-types';
import * as OJP_Next from 'ojp-sdk-next';
import OJP_Legacy from '../../config/ojp-legacy';
import { AnyPlace } from '../models/place/place-builder';

export type StopEventType = 'arrival' | 'departure';
export type VehicleAccessType = 'PLATFORM_ACCESS_WITHOUT_ASSISTANCE' | 'PLATFORM_ACCESS_WITH_ASSISTANCE' | 'PLATFORM_ACCESS_WITH_ASSISTANCE_WHEN_NOTIFIED' | 'PLATFORM_NOT_WHEELCHAIR_ACCESSIBLE' | 'ALTERNATIVE_TRANSPORT' | 'NO_DATA';

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
  place: AnyPlace | null,
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

export type AnyPlaceSchema = OJP_Types.PlaceSchema | OJP_Types.OJPv1_LocationSchema;
export type AnyPlaceResultSchema = OJP_Types.PlaceResultSchema | OJP_Types.OJPv1_LocationResultSchema;
export type AnyPointOfInterestSchema = OJP_Types.PointOfInterestSchema | OJP_Types.OJPv1_PointOfInterestSchema;
export type AnyTripResultSchema = OJP_Types.TripResultSchema | OJP_Types.OJPv1_TripResultSchema;
export type AnyResponseContextSchema = OJP_Types.ResponseContextSchema | OJP_Types.OJPv1_ResponseContextSchema;
export type AnyPtSituationElement = OJP_Types.PtSituationElement | OJP_Types.OJPv1_PtSituationElement;

export type AnyLocationInformationRequest = OJP_Next.LocationInformationRequest | OJP_Next.OJPv1_LocationInformationRequest;
export type AnyLocationInformationRequestResponse = OJP_Next.LocationInformationRequestResponse | OJP_Next.OJPv1_LocationInformationRequestResponse;
export type AnyStopEventRequestResponse = OJP_Next.StopEventRequestResponse | OJP_Next.OJPv1_StopEventRequestResponse;
export type AnyTripInfoRequestResponse = OJP_Next.TripInfoRequestResponse | OJP_Next.OJPv1_TripInfoRequestResponse;
export type AnyTripRequestResponse = OJP_Next.TripRequestResponse | OJP_Next.OJPv1_TripRequestResponse;
