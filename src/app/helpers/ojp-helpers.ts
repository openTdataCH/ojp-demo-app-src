import { DomSanitizer } from '@angular/platform-browser';

import * as OJP_Next from 'ojp-sdk-next';
import * as OJP_SharedTypes from 'ojp-shared-types';

import OJP_Legacy from '../config/ojp-legacy';

import { LegStopPointData } from '../shared/components/service-stops.component';
import { APP_STAGE, DEBUG_LEVEL, DEFAULT_APP_STAGE } from '../config/constants';
import { AnyLocationInformationRequestResponse, AnyPlaceResultSchema, AnyPlaceSchema, AnyStopEventRequestResponse, AnyTripInfoRequestResponse, StopEventType, StopPointCall, VehicleAccessType } from '../shared/types/_all';
import { JourneyService } from '../shared/models/journey-service';
import { PlaceLocation } from '../shared/models/place/location';
import { APP_CONFIG } from '../config/app-config';
import { StopPlace } from '../shared/models/place/stop-place';
import { PlaceBuilder } from '../shared/models/place/place-builder';
import { SituationContent } from '../shared/models/situation';

type PublicTransportPictogram =  'picto-bus-fallback' | 'picto-bus'
  | 'picto-railway' | 'picto-tram' | 'picto-rack-railway'
  | 'picto-boat'
  | 'picto-funicular' | 'picto-cablecar' | 'picto-gondola' | 'picto-chairlift'
  | 'car-sharing' | 'autozug' | 'train-gf';

const stopEventTypes: StopEventType[] = ['arrival', 'departure'];
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

  public static computeIconFilenameForLeg(leg: OJP_Legacy.TripLeg): string {
    if (leg.legType === 'TransferLeg') {
      return 'picto-walk';
    }

    if (leg.legType === 'TimedLeg') {
      const timdLeg = leg as OJP_Legacy.TripTimedLeg;
      const service = JourneyService.initWithOJP_LegacyJourneyService(timdLeg.service);
      const serviceIcon = OJPHelpers.computeIconFilenameForService(service);
      return serviceIcon;
    }

    if (leg.legType === 'ContinuousLeg') {
      const continousLeg = leg as OJP_Legacy.TripContinuousLeg;
      if (continousLeg.isDriveCarLeg()) {
        return 'car-sharing';
      }

      if (continousLeg.isSharedMobility()) {
        return 'velo-scooter-sharing';
      }

      if (continousLeg.isTaxi()) {
        return 'taxi';
      }

      if (continousLeg.legTransportMode === 'car-shuttle-train') {
        return 'autozug';
      }

      if (continousLeg.legTransportMode === 'car-ferry') {
        return 'ferry';
      }

      return 'picto-walk';
    }

    return 'picto-bus-fallback';
  }

  public static isCar(leg: OJP_Legacy.TripContinuousLeg) {
    const isCar = leg.legTransportMode === 'self-drive-car';
    return isCar;
  }

  public static updateLocationDataWithTime(stopPointData: LegStopPointData, stopPoint: StopPointCall) {
    const depArrTypes: StopEventType[] = ['arrival', 'departure'];

    depArrTypes.forEach(depArrType => {
      const isArr = depArrType === 'arrival';
      const depArrTime = isArr ? stopPoint.arrival : stopPoint.departure;

      if (isArr) {
        stopPointData.arrText = stopPoint.arrival.timetableF;
      } else {
        stopPointData.depText = stopPoint.departure.timetableF;
      }

      const delayText = OJPHelpers.computeStopPointDelayText(depArrType, stopPoint);
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
      firstClassIcon: OJPHelpers.computeOccupancyLevelIcon(stopPoint.mapFareClassOccupancy, 'firstClass'),
      firstClassText: OJPHelpers.computeOccupancyLevelText(stopPoint.mapFareClassOccupancy, 'firstClass'),
      secondClassIcon: OJPHelpers.computeOccupancyLevelIcon(stopPoint.mapFareClassOccupancy, 'secondClass'),
      secondClassText: OJPHelpers.computeOccupancyLevelText(stopPoint.mapFareClassOccupancy, 'secondClass'),
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

  public static computeSituationsData(sanitizer: DomSanitizer, siriSituations: OJP_Legacy.PtSituationElement[]): SituationContent[] {
    const situationsData: SituationContent[] = [];

    siriSituations.forEach(situation => {
      if (situation.situationContent !== null) {
        const situationContent = SituationContent.initWithData(
          sanitizer, 
          situation.situationNumber, 
          situation.situationContent.summary, 
          situation.situationContent.descriptions, 
          situation.situationContent.details
        );
        situationsData.push(situationContent);
      }

      situation.publishingActions.forEach(publishingAction => {
        const mapTextualContent = publishingAction.passengerInformation.mapTextualContent;

        const summary: string = (() => {
          if ('Summary' in mapTextualContent) {
            return mapTextualContent['Summary'].join('. ');
          } else {
            return 'Summary n/a';
          }
        })();

        let descriptions: string[] = [];
        if ('Description' in mapTextualContent) {
          descriptions = mapTextualContent['Description'];
        }

        let details: string[] = [];
        const detailKeys = ['Consequence', 'Duration', 'Reason', 'Recommendation', 'Remark'];
        detailKeys.forEach(detailKey => {
          if (detailKey in mapTextualContent) {
            details = details.concat(mapTextualContent[detailKey]);
          }
        });

        const infoLink = publishingAction.passengerInformation.infoLink;
        if (infoLink) {
          details.push(infoLink.label);
        }

        const situationContent = SituationContent.initWithData(
          sanitizer, 
          situation.situationNumber, 
          summary, 
          descriptions, 
          details
        );
        situationsData.push(situationContent);
      });
    });

    return situationsData;
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

  private static computeOccupancyLevelIcon(mapFareClassOccupancy: OJP_Legacy.MapFareClassOccupancy | null, fareClassType: OJP_Legacy.FareClassType): string | null {
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

  private static computeOccupancyLevelText(mapFareClassOccupancy: OJP_Legacy.MapFareClassOccupancy | null, fareClassType: OJP_Legacy.FareClassType): string {
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

  public static convertOJP_LegacyStopPoint2StopPointCall(oldStopPoint: OJP_Legacy.StopPoint): StopPointCall {
    const stopCall: StopPointCall = {
      place: null,
      stopPointRef: oldStopPoint.location.stopPlace?.stopPlaceRef ?? 'n/a stopPointRef',
      stopPointName: oldStopPoint.location.stopPlace?.stopPlaceName ?? 'n/a stopPointName',
      platform: {
        timetable: oldStopPoint.plannedPlatform,
        realtime: oldStopPoint.actualPlatform,
      },
      // this is later updated, see below
      arrival: {
        timetable: null,
        realtime: null,
        timetableF: '',
        realtimeF: '',
      },
      // this is later updated, see below
      departure: {
        timetable: null,
        realtime: null,
        timetableF: '',
        realtimeF: '',
      },
      vehicleAccessType: OJPHelpers.computePlatformAssistance(oldStopPoint.vehicleAccessType),
      mapFareClassOccupancy: oldStopPoint.mapFareClassOccupancy,
      isNotServicedStop: oldStopPoint.isNotServicedStop,
    };

    const geoPosition = oldStopPoint.location.geoPosition;
    if (geoPosition) {
      stopCall.place = new PlaceLocation(geoPosition.longitude, geoPosition.latitude);
    }
    
    stopEventTypes.forEach(stopEventType => {
      const isArrival = stopEventType === 'arrival';

      const sourceStopEvent = isArrival ? oldStopPoint.arrivalData : oldStopPoint.departureData;
      
      const timetableDate = sourceStopEvent?.timetableTime ?? null;
      const timetableDateF = timetableDate ? OJP_Next.DateHelpers.formatTimeHHMM(timetableDate) : '';
      
      const realtimeDate = sourceStopEvent?.estimatedTime ?? null;
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

    return stopCall;
  }

  public static computeTripHash(trip: OJP_Legacy.Trip): string {
    const endpointTypes: OJP_Legacy.JourneyPointType[] = ['From', 'To'];

    const hashParts: string[] = [];

    trip.legs.forEach((leg, idx) => {
      const legHash = leg.legType + idx;
      hashParts.push(legHash);

      const durationHash = leg.legDuration?.asOJPFormattedText() ?? 'duration_na';
      hashParts.push(durationHash);

      if (leg.legType === 'TimedLeg') {
        const timedLeg = leg as OJP_Legacy.TripTimedLeg;
        const serviceHash = timedLeg.service.formatServiceName();
        hashParts.push(serviceHash);

        endpointTypes.forEach(endpointType => {
          const isFrom = endpointType === 'From';

          const endpointTimeDate = isFrom ? timedLeg.fromStopPoint.departureData?.timetableTime : timedLeg.toStopPoint.arrivalData?.timetableTime;
          if (endpointTimeDate) {
            const endpointTimeDateS = OJP_Next.DateHelpers.formatTimeHHMM(endpointTimeDate);
            hashParts.push(endpointTimeDateS);
          }
        });
      }
    });

    const tripHash = hashParts.join('_');

    return tripHash;
  }

  public static formatDistance(distanceMeters: number): string {
    if (distanceMeters > 1000) {
      const distanceKmS = (distanceMeters / 1000).toFixed(1) + 'km';
      return distanceKmS;
    }

    return distanceMeters + 'm'
  }

  public static parseAnyTripInfoPlaceContext(version: OJP_Next.OJP_VERSION, response: AnyTripInfoRequestResponse): Record<string, StopPlace> {
    const isOJPv2 = version === '2.0';

    let placeResults: AnyPlaceResultSchema[] = [];
    if (isOJPv2) {
      const responseOJPv2 = response as OJP_Next.TripInfoRequestResponse;
      if (responseOJPv2.ok) {
        const places = responseOJPv2.value.tripInfoResponseContext?.places?.place ?? [];
        placeResults = places.map(place => {
          const placeResult: OJP_SharedTypes.PlaceResultSchema = {
            place: place,
            complete: true,
          };
          return placeResult;
        });
      }
    } else {
      const responseOJPv1 = response as OJP_Next.OJPv1_TripInfoRequestResponse;
      if (responseOJPv1.ok) {
        const places = responseOJPv1.value.tripInfoResponseContext?.places?.location ?? [];
        placeResults = places.map(place => {
          const placeResult: OJP_SharedTypes.OJPv1_LocationResultSchema = {
            location: place,
            complete: true,
          };
          return placeResult;
        });
      }
    }

    const mapPlaces = OJPHelpers.mapAnyPlaceResults(version, placeResults);
    return mapPlaces;
  }

  public static parseAnyStopEventResultPlaceContext(version: OJP_Next.OJP_VERSION, response: AnyStopEventRequestResponse): Record<string, StopPlace> {
    const isOJPv2 = version === '2.0';

    let placeResults: AnyPlaceResultSchema[] = [];
    if (isOJPv2) {
      const responseOJPv2 = response as OJP_Next.StopEventRequestResponse;
      if (responseOJPv2.ok) {
        const places = responseOJPv2.value.stopEventResponseContext?.places?.place ?? [];
        placeResults = places.map(place => {
          const placeResult: OJP_SharedTypes.PlaceResultSchema = {
            place: place,
            complete: true,
          };
          return placeResult;
        });
      }
    } else {
      const responseOJPv1 = response as OJP_Next.OJPv1_StopEventRequestResponse;
      if (responseOJPv1.ok) {
        const places = responseOJPv1.value.stopEventResponseContext?.places?.location ?? [];
        placeResults = places.map(place => {
          const placeResult: OJP_SharedTypes.OJPv1_LocationResultSchema = {
            location: place,
            complete: true,
          };
          return placeResult;
        });
      }
    }

    const mapPlaces = OJPHelpers.mapAnyPlaceResults(version, placeResults);
    return mapPlaces;
  }

  public static parseAnyStopEventResultSituationsContext(sanitizer: DomSanitizer, version: OJP_Next.OJP_VERSION, response: AnyStopEventRequestResponse): Record<string, SituationContent[]> {
    const mapSituations: Record<string, SituationContent[]> = {};

    if (response.ok) {
      const situationsSchema = response.value.stopEventResponseContext?.situations?.ptSituation ?? [];
      situationsSchema.forEach(situationSchema => {
        const situationElements = SituationContent.initWithAnySituationSchema(sanitizer, version, situationSchema);
        if (situationElements.length > 0) {
          mapSituations[situationElements[0].situationNumber] = situationElements;
        }
      });
    }

    return mapSituations;
  }

  private static mapAnyPlaceResults(ojpVersion: OJP_Next.OJP_VERSION, placeResults: AnyPlaceResultSchema[]) {
    const places: StopPlace[] = [];
    placeResults.forEach(placeResult => {
      const place = PlaceBuilder.initWithPlaceResultSchema(ojpVersion, placeResult);
      if (place && place.type === 'stop') {
        places.push(place as StopPlace);
      }
    });

    const mapPlaces: Record<string, StopPlace> = {};
    places.forEach(place => {
      mapPlaces[place.stopRef] = place;
    });

    return mapPlaces;
  }

  public static parseAnyPlaceResult(version: OJP_Next.OJP_VERSION, response: AnyLocationInformationRequestResponse): AnyPlaceResultSchema[] {
    const isOJPv2 = version === '2.0';

    let placeResults: AnyPlaceResultSchema[] = [];
    
    if (isOJPv2) {
      const responseOJPv2 = response as OJP_Next.LocationInformationRequestResponse;
      if (responseOJPv2.ok) {
        placeResults = placeResults.concat(responseOJPv2.value.placeResult);
      }
    } else {
      const responseOJPv1 = response as OJP_Next.OJPv1_LocationInformationRequestResponse;
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

  public static createStopPointCall(callAtStopSchema: OJP_SharedTypes.CallAtStopSchema, place: StopPlace | null): StopPointCall {
    const vehicleAccessTypeS = callAtStopSchema.nameSuffix?.text ?? null;
    const vehicleAccessType = OJPHelpers.computePlatformAssistance(vehicleAccessTypeS);

    const stopCall: StopPointCall = {
      place: place,
      stopPointRef: callAtStopSchema.stopPointRef,
      stopPointName: callAtStopSchema.stopPointName.text,
      platform: {
        timetable: callAtStopSchema.plannedQuay?.text ?? null,
        realtime: callAtStopSchema.plannedQuay?.text ?? null,
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
      isNotServicedStop: (callAtStopSchema.notServicedStop === undefined) ? null : callAtStopSchema.notServicedStop,
    };

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

    return stopCall;
  }
}
