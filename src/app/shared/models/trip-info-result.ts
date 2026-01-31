import * as OJP_Types from 'ojp-shared-types';
import * as OJP_Next from 'ojp-sdk-next';

import OJP_Legacy from '../../config/ojp-legacy';

import { OJP_VERSION } from '../../config/constants';

import { AnyTripInfoRequestResponse, StopEventType } from '../types/_all';
import { OJPHelpers } from '../../helpers/ojp-helpers';
import { JourneyService } from './journey-service';
import { StopPointCall } from './stop-point-call';

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

  public static initWithTripInfoResponse(ojpVersion: OJP_Legacy.OJP_VERSION_Type, response: AnyTripInfoRequestResponse | null): TripInfoResult | null {
    if (response === null || !response.ok) {
      return null;
    }

    const tripInfoDeliverySchema = response.value;

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

    const mapPlaces = OJPHelpers.parseAnyPlaceContext(ojpVersion, response.value.tripInfoResponseContext);

    const calls: StopPointCall[] = [];
    const callsSchema = firstTripInfoResultSchema.previousCall.concat(firstTripInfoResultSchema.onwardCall);
    callsSchema.forEach((callSchema, idx) => {
      const place = mapPlaces[callSchema.stopPointRef] ?? null;

      const stopCall = StopPointCall.initWithCallAtStopSchema(callSchema, place);

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
