import { DomSanitizer } from '@angular/platform-browser';

import * as OJP from 'ojp-sdk';
import * as OJP_Types from 'ojp-shared-types';

import { APP_STAGE, DEBUG_LEVEL, DEFAULT_APP_STAGE } from '../config/constants';
import { AnyLocationInformationRequestResponse, AnyPlaceResultSchema, AnyPtSituationElement, AnyResponseContextSchema } from '../shared/types/_all';
import { JourneyService } from '../shared/models/journey-service';
import { APP_CONFIG } from '../config/app-config';
import { StopPlace } from '../shared/models/place/stop-place';
import { PlaceBuilder } from '../shared/models/place/place-builder';
import { SituationContent } from '../shared/models/situation';
import { TripLegLineType } from '../shared/types/map-geometry-types';
import { TripData, TripLegData } from '../shared/types/trip';
import { TripLegGeoController } from '../shared/controllers/trip-geo-controller';
import { Trip } from '../shared/models/trip/trip';
import { TimedLeg } from '../shared/models/trip/leg/timed-leg';
import { AnyLeg } from '../shared/models/trip/leg-builder';
import { ContinuousLeg } from '../shared/models/trip/leg/continuous-leg';
import { TransferLeg } from '../shared/models/trip/leg/transfer-leg';

type PublicTransportPictogram =  'picto-bus-fallback' | 'picto-bus'
  | 'picto-railway' | 'picto-tram' | 'picto-rack-railway'
  | 'picto-boat'
  | 'picto-funicular' | 'picto-cablecar' | 'picto-gondola' | 'picto-chairlift'
  | 'car-sharing' | 'autozug' | 'train-gf';

export class OJPHelpers {
  public static computeIconFilenameForService(service: JourneyService): PublicTransportPictogram {
    if (service.mode.ptMode === 'bus') {
      return 'picto-bus';
    }

    if (service.mode.shortName?.text === 'ATZ') {
      const hasGF = service.attribute.find(el => el.code === 'A__GF') ?? null;
      if (hasGF) {
        return 'train-gf';
      } else {
        return 'autozug';
      }
    }

    if (service.mode.ptMode === 'rail') {
      return 'picto-railway';
    }

    if (service.mode.ptMode === 'tram') {
      return 'picto-tram';
    }

    // ojp:PtMode === funicular
    if (service.mode.shortName?.text === 'CC') {
      return 'picto-rack-railway';
    }
    
    // ojp:PtMode === telecabin
    if (service.mode.shortName?.text === 'FUN') {
      return 'picto-funicular';
    }
    if (service.mode.shortName?.text === 'PB') {
      return 'picto-cablecar';
    }
    if (service.mode.shortName?.text === 'GB') {
      return 'picto-gondola';
    }
    if (service.mode.shortName?.text === 'SL') {
      return 'picto-chairlift';
    }

    if (service.mode.ptMode === 'water') {
      return 'picto-boat';
    }

    const isDemandMode = (service.mode.busSubmode === 'demandAndResponseBus' || service.mode.busSubmode === 'unknown');
    if (isDemandMode) {
      return 'car-sharing';
    }

    return 'picto-bus-fallback';
  }

  public static computeIconFilenameForLeg(leg: AnyLeg): string {
    if (leg.type === 'TransferLeg') {
      return 'picto-walk';
    }

    if (leg.type === 'TimedLeg') {
      const timdLeg = leg as TimedLeg;
      const serviceIcon = OJPHelpers.computeIconFilenameForService(timdLeg.service);
      return serviceIcon;
    }

    if (leg.type === 'ContinuousLeg') {
      const continousLeg = leg as ContinuousLeg;
      if (continousLeg.isDriveCarLeg()) {
        return 'car-sharing';
      }

      if (continousLeg.isSharedMobility()) {
        return 'velo-scooter-sharing';
      }

      if (continousLeg.isTaxi()) {
        return 'taxi';
      }

      // TODOTRIPMIGRATION - check car-shuttle-train, car-ferry
      // 
      // if (continousLeg.legTransportMode === 'car-shuttle-train') {
      //   return 'autozug';
      // }

      // if (continousLeg.legTransportMode === 'car-ferry') {
      //   return 'ferry';
      // }

      return 'picto-walk';
    }

    return 'picto-bus-fallback';
  }



  public static async fetchGist(gistId: string): Promise<string | null> {
    const gistURLMatches = gistId.match(/https:\/\/gist.github.com\/[^\/]+?\/([0-9a-z]*)/);
    if (gistURLMatches !== null) {
      gistId = gistURLMatches[1];
    }

    const gistAPI = 'https://api.github.com/gists/' + gistId;
    const gistJSON = await (await fetch(gistAPI)).json();
    const gistFiles = gistJSON['files'] as Record<string, any>;

    for (const gistFile in gistFiles) {
      const gistFileData = gistFiles[gistFile];
      if (gistFileData['language'] !== 'XML') {
        continue;
      }

      let mockText = gistFileData['content'];

      if (gistFileData['truncated'] === true) {
        const gistRawURL = gistFileData['raw_url'];
        console.log('GIST response truncated, fetching content from raw_url: ' + gistRawURL);
        mockText = await (await fetch(gistRawURL)).text();
      }
      
      return mockText;
    }

    return null;
  }

  public static formatDistance(distanceMeters: number): string {
    if (distanceMeters > 1000) {
      const distanceKmS = (distanceMeters / 1000).toFixed(1) + 'km';
      return distanceKmS;
    }

    return distanceMeters + 'm';
  }

  public static parseAnyPlaceContext(version: OJP.OJP_VERSION, responseContextSchema: AnyResponseContextSchema | undefined): Record<string, StopPlace> {
    if (responseContextSchema === undefined) {
      return {};
    }

    const isOJPv2 = version === '2.0';

    let placeResults: AnyPlaceResultSchema[] = [];
    if (isOJPv2) {
      const responseOJPv2 = responseContextSchema as OJP_Types.ResponseContextSchema;
      const places = responseOJPv2.places?.place ?? [];
      placeResults = places.map(place => {
        const placeResult: OJP_Types.PlaceResultSchema = {
          place: place,
          complete: true,
        };
        return placeResult;
      });
    } else {
      const responseOJPv1 = responseContextSchema as OJP_Types.OJPv1_ResponseContextSchema;
      const places = responseOJPv1.places?.location ?? [];
      placeResults = places.map(place => {
        const placeResult: OJP_Types.OJPv1_LocationResultSchema = {
          location: place,
          complete: true,
        };
        return placeResult;
      });
    }

    const mapPlaces = OJPHelpers.mapAnyPlaceResults(version, placeResults);
    return mapPlaces;
  }

  public static parseAnySituationsContext(sanitizer: DomSanitizer, version: OJP.OJP_VERSION, responseContextSchema: AnyResponseContextSchema | undefined): Record<string, SituationContent[]> {
    if (responseContextSchema === undefined) {
      return {};
    }

    const mapSituations: Record<string, SituationContent[]> = {};

    const isOJPv2 = version === '2.0';

    const situationsSchema: AnyPtSituationElement[] = responseContextSchema.situations?.ptSituation ?? [];
    situationsSchema.forEach(situationsSchema => {
      const situationContentData = SituationContent.initWithAnySituationSchema(sanitizer, version, situationsSchema);
      if (situationContentData.length > 0) {
        const situationNumber = situationContentData[0].situationNumber;
        mapSituations[situationNumber] = situationContentData;
      }
    });
    
    return mapSituations;
  }

  private static mapAnyPlaceResults(ojpVersion: OJP.OJP_VERSION, placeResults: AnyPlaceResultSchema[]) {
    const places: StopPlace[] = [];
    placeResults.forEach(placeResult => {
      const place = PlaceBuilder.initWithPlaceResultSchema(ojpVersion, placeResult);
      if (place && place.type === 'stop') {
        places.push(place as StopPlace);
      }
    });

    const mapPlaces: Record<string, StopPlace> = {};
    places.forEach(place => {
      mapPlaces[place.placeRef.ref] = place;
    });

    return mapPlaces;
  }

  public static parseAnyPlaceResult(version: OJP.OJP_VERSION, response: AnyLocationInformationRequestResponse): AnyPlaceResultSchema[] {
    const isOJPv2 = version === '2.0';

    let placeResults: AnyPlaceResultSchema[] = [];
    
    if (isOJPv2) {
      const responseOJPv2 = response as OJP.LocationInformationRequestResponse;
      if (responseOJPv2.ok) {
        placeResults = placeResults.concat(responseOJPv2.value.placeResult);
      }
    } else {
      const responseOJPv1 = response as OJP.OJPv1_LocationInformationRequestResponse;
      if (responseOJPv1.ok) {
        placeResults = placeResults.concat(responseOJPv1.value.location);
      }
    }

    return placeResults;
  }

  public static computeAppStage(): APP_STAGE {
    const queryParams = new URLSearchParams(document.location.search);
    const userAppStageS = queryParams.get('stage') ?? null;
    if (userAppStageS === null) {
      return DEFAULT_APP_STAGE;  
    }

    const availableStages = Object.keys(APP_CONFIG.stages) as APP_STAGE[];

    const availableStagesLower: string[] = availableStages.map(stage => {
      return stage.toLowerCase();
    });

    const appStage = userAppStageS.trim() as APP_STAGE;
    const stageIDX = availableStagesLower.indexOf(appStage.toLowerCase());
    if (stageIDX !== -1) {
      return availableStages[stageIDX];
    }
    
    return DEFAULT_APP_STAGE;
  }

  public static computeLegLineType(leg: AnyLeg): TripLegLineType {
    const defaultType: TripLegLineType = 'Unknown';

    if (leg.type === 'ContinuousLeg') {
      const continuousLeg = leg as ContinuousLeg;

      if (continuousLeg.isDriveCarLeg()) {
        return 'Self-Drive Car';
      }
  
      if (continuousLeg.isSharedMobility()) {
        return 'Shared Mobility';
      }
  
      if (continuousLeg.isTaxi()) {
        return 'OnDemand';
      }
  
      if (continuousLeg.isWater()) {
        return 'Water';
      }

      return 'Walk';
    }

    if (leg.type === 'TransferLeg') {
      return 'Transfer';
    }
    
    if (leg.type === 'TimedLeg') {
      const timedLeg = leg as TimedLeg;
      return timedLeg.service.computeLegColorType();
    }

    return defaultType;
  }

  // Some of the legs can be merged
  // ex1: trains with multiple desitinaion units
  // - check for remainInVehicle https://github.com/openTdataCH/ojp-demo-app-src/issues/125  
  private static mergeTripLegs(tripsData: TripData[]) {
    tripsData.forEach((tripData, tripIdx) => {
      const newLegsData: TripLegData[] = [];
      let skipIdx: number = -1;
      
      tripData.trip.legs.forEach((leg, legIdx) => {
        const legData: TripLegData = {
          tripId: tripData.trip.id,
          leg: leg,
          info: {
            id: '' + leg.id,
            comments: null,
          },
          map: tripData.legsData[legIdx].map,
        };

        if (legIdx <= skipIdx) {
          return;
        }

        const leg2Idx = legIdx + 1;
        const leg3Idx = legIdx + 2;
        if (leg3Idx >= tripData.trip.legs.length) {
          newLegsData.push(legData);
          return;
        }

        // If TransferLeg of type 'remainInVehicle'
        // => merge prev / next TimedLeg legs
        let shouldMergeLegs = false;
        const leg2 = tripData.trip.legs[leg2Idx];
        const leg3 = tripData.trip.legs[leg3Idx];
        if (leg.type === 'TimedLeg' && leg2.type === 'TransferLeg' && leg3.type === 'TimedLeg') {
          const transferLeg = leg2 as TransferLeg;
          if ((transferLeg.transferType === 'remainInVehicle') || (transferLeg.transferType === 'changeWithinVehicle')) {
            shouldMergeLegs = true;
            skipIdx = leg3Idx;
          }
        }

        if (shouldMergeLegs) {
          const leg1Timed = leg as TimedLeg;
          const leg3Timed = leg3 as TimedLeg;
          const newLeg = leg1Timed.mergeWithAnotherTimedLeg(leg3Timed);
          
          legData.leg = newLeg;
          legData.info.id = (legIdx + 1) + '-' + (leg3Idx + 1);
          legData.info.comments = 'Timed legs were merged: ' +  legData.info.id;
        }

        newLegsData.push(legData);
      });

      if (tripData.trip.legs.length > 0 && (tripData.trip.legs.length !== newLegsData.length)) {
        tripData.info.comments = 'APP-HACK - mergeTripLegs - remainInVehicle usecase, before: ' + tripData.trip.legs.length + ', after: ' + newLegsData.length + ' legs';

        if (DEBUG_LEVEL === 'DEBUG') {
          // console.log(tripData.info.comments);
        }

        tripData.legsData = newLegsData;
      }
    });
  }

  public static convertTripsToTripData(trips: Trip[]): TripData[] {
    const tripsData = trips.map((trip, tripIdx) => {
      const legsData = trip.legs.map(leg => {
        const legData: TripLegData = {
          tripId: trip.id,
          leg: leg,
          info: {
            id: '' + leg.id,
            comments: null,
          },
          map: {
            show: true,
            showPreciseLine: !TripLegGeoController.shouldUseBeeline(leg),
            showOtherProvider: false,
            legShapeResult: null,
            legShapeError: null,
          }
        };
        return legData;
      });

      const tripData: TripData = {
        trip: trip,
        legsData: legsData,
        info: {
          comments: null,
        }
      };

      return tripData;
    });
    
    OJPHelpers.mergeTripLegs(tripsData);

    return tripsData;
  }
}
