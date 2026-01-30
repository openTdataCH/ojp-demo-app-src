import * as OJP_Types from 'ojp-shared-types';
import * as OJP_Next from 'ojp-sdk-next';

export type StopEventType = 'arrival' | 'departure';

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

export interface BookingArrangement {
  agencyCode: string,
  agencyName: string,
  infoURL: string,
}

export type TripModeType = 'monomodal' | 'mode_at_start' | 'mode_at_end' | 'mode_at_start_end';

// https://vdvde.github.io/OJP/develop/documentation-tables/siri.html#type_siri__VehicleModesOfTransportEnumeration
export type ModeOfTransportType = 'air' |
    'bus' | 'coach' | 'trolleyBus' |
    'metro' | 'rail' | 'tram' | 
    'water' | 'ferry' |
    'cableway' | 'funicular' | 'lift' |
    'other' | 'unknown';

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

export type JourneyPointType = 'From' | 'To' | 'Via';
