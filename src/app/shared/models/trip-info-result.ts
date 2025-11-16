import * as OJP_Types from 'ojp-shared-types';
import * as OJP_Next from 'ojp-sdk-next';

import OJP_Legacy from '../../config/ojp-legacy';

import { OJP_VERSION } from '../../config/constants';

import { StopEventType, StopPointCall, StopPointCallType } from '../types/_all';
import { OJPHelpers } from '../../helpers/ojp-helpers';
import { JourneyService } from './journey-service';

const stopEventTypes: StopEventType[] = ['arrival', 'departure'];

export class TripInfoResult {
  public calls: StopPointCall[];
  public service: JourneyService;
  public trackSectionsGeoPositions: OJP_Next.GeoPosition[][];

  private constructor(calls: StopPointCall[], service: JourneyService) {
    this.calls = calls;
    this.service = service;
    this.trackSectionsGeoPositions = [];
  }

  public static initWithTripInfoDeliverySchema(ojpVersion: OJP_Legacy.OJP_VERSION_Type, tripInfoDeliverySchema: OJP_Types.TripInfoDeliverySchema | OJP_Types.OJPv1_TripInfoDeliverySchema | null): TripInfoResult | null {
    if (tripInfoDeliverySchema === null) {
      return null;
    }

    if (tripInfoDeliverySchema.tripInfoResult.length === 0) {
      console.error('ERROR: TripInfoResult.initWithTripInfoDeliverySchema: empty tripInfoResult');
      console.log(tripInfoDeliverySchema);
      return null;
    }

    if (tripInfoDeliverySchema.tripInfoResult.length > 1) {
      console.error('ERROR: TripInfoResult.initWithTripInfoDeliverySchema: more than 1 tripInfoResult? using first');
      console.log(tripInfoDeliverySchema);
    }

    const firstTripInfoResultSchema = tripInfoDeliverySchema.tripInfoResult[0];

    if (!firstTripInfoResultSchema.service) {
      console.error('ERROR: TripInfoResult.initWithTripInfoDeliverySchema: service is expected');
      console.log(tripInfoDeliverySchema);
      return null;
    }

    const places: OJP_Next.Place[] = [];
    if (ojpVersion === '2.0') {
      const tripInfoDeliverySchemaOJPv2 = tripInfoDeliverySchema as OJP_Types.TripInfoDeliverySchema;

      const placesSchema = tripInfoDeliverySchemaOJPv2.tripInfoResponseContext?.places?.place ?? [];
      placesSchema.forEach(placeSchema => {
        const place = OJP_Next.Place.initWithXMLSchema(placeSchema);
        places.push(place);
      });
    } else {
      const tripInfoDeliverySchemaOJPv1 = tripInfoDeliverySchema as OJP_Types.OJPv1_TripInfoDeliverySchema;

      const placesSchema = tripInfoDeliverySchemaOJPv1.tripInfoResponseContext?.places?.location ?? [];
      placesSchema.forEach(placeSchema => {
        const place = OJP_Next.Place.initWithOJPv1XMLSchema(placeSchema);
        places.push(place);
      });
    }

    const mapPlaces: Record<string, OJP_Next.Place> = {};
    places.forEach(place => {
      const stopPlaceRef = place.stopPlace?.stopPlaceRef ?? null;
      if (stopPlaceRef) {
        mapPlaces[stopPlaceRef] = place;
      }
      const stopPointRef = place.stopPoint?.stopPointRef ?? null;
      if (stopPointRef) {
        mapPlaces[stopPointRef] = place;
      }
    });

    const calls: StopPointCall[] = [];

    const callsSchema = firstTripInfoResultSchema.previousCall.concat(firstTripInfoResultSchema.onwardCall);
    callsSchema.forEach((callSchema, idx) => {
      const place = mapPlaces[callSchema.stopPointRef] ?? null;

      const stopPointCallType: StopPointCallType = (() => {
        const isFirst = idx === 0;
        if (isFirst) {
          return 'From';
        }

        const isLast = idx === (callsSchema.length - 1);
        if (isLast) {
          return 'To';
        }

        return 'Intermediate';
      })();

      const vehicleAccessTypeS = callSchema.nameSuffix?.text ?? null;
      const vehicleAccessType = OJPHelpers.computePlatformAssistance(vehicleAccessTypeS);

      const stopCall: StopPointCall = {
        type: stopPointCallType,
        place: place,
        stopPointRef: callSchema.stopPointRef,
        stopPointName: callSchema.stopPointName.text,
        platform: {
          timetable: callSchema.plannedQuay?.text ?? null,
          realtime: callSchema.plannedQuay?.text ?? null,
        },
        arrival: {
          timetable: null,
          realtime: null,
          timetableF: '',
          realtimeF: '',
        },
        departure: {
          timetable: null,
          realtime: null,
          timetableF: '',  
          realtimeF: '',
        },
        vehicleAccessType: vehicleAccessType,
        mapFareClassOccupancy: null,
        isNotServicedStop: (callSchema.notServicedStop === undefined) ? null : callSchema.notServicedStop,
      };

      stopEventTypes.forEach(stopEventType => {
        const isArrival = stopEventType === 'arrival';
        const sourceStopEvent = (isArrival ? callSchema.serviceArrival : callSchema.serviceDeparture) ?? null;

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

      calls.push(stopCall);
    });

    const journeyService: JourneyService | null = (() => {
      const isOJPv2 = OJP_VERSION === '2.0';

      if (!isOJPv2) {
        const oldTripInfoResultSchema = firstTripInfoResultSchema as OJP_Types.OJPv1_TripInfoResultStructureSchema;
        const service = JourneyService.initWithLegacyTripInfoResultSchema(oldTripInfoResultSchema);
        return service;
      }

      const serviceSchema = (firstTripInfoResultSchema as OJP_Types.TripInfoResultStructureSchema).service ?? null;
      if (serviceSchema) {
        const service = JourneyService.initWithDatedJourneySchema(serviceSchema);
        return service;
      }

      return null;
    })();

    if (journeyService === null) {
      return null;
    }

    const tripInfoResult = new TripInfoResult(calls, journeyService);

    tripInfoResult.trackSectionsGeoPositions = [];
    const trackSections = firstTripInfoResultSchema.journeyTrack?.trackSection ?? [];
    trackSections.forEach(trackSectionSchema => {
      const trackSectionGeoPositions: OJP_Next.GeoPosition[] = [];

      const positions = trackSectionSchema.linkProjection?.position ?? [];
      positions.forEach(geoPositionSchema => {
        const geoPosition = new OJP_Next.GeoPosition(geoPositionSchema);
        if (geoPosition.isValid()) {
          trackSectionGeoPositions.push(geoPosition);
        }
      });

      tripInfoResult.trackSectionsGeoPositions.push(trackSectionGeoPositions);
    });

    return tripInfoResult;
  }
}
