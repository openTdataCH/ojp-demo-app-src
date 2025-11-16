import { DomSanitizer } from '@angular/platform-browser';

import * as OJP_Next from 'ojp-sdk-next';

import OJP_Legacy from '../config/ojp-legacy';

import { LegStopPointData } from '../shared/components/service-stops.component';
import { DEBUG_LEVEL } from '../config/constants';
import { SituationContent } from '../shared/types/situations';
import { AnyLocationInformationRequestResponse, AnyPlaceResultSchema, StopEventType, StopPointCall, VehicleAccessType } from '../shared/types/_all';
import { JourneyService } from '../shared/models/journey-service';

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
    const situationsData: OJP_Legacy.SituationContent[] = [];

    siriSituations.forEach(situation => {
      if (situation.situationContent !== null) {
        situationsData.push(situation.situationContent);
      }

      situation.publishingActions.forEach(publishingAction => {
        const mapTextualContent = publishingAction.passengerInformation.mapTextualContent;

        const situationData = <OJP_Legacy.SituationContent>{};

        if ('Summary' in mapTextualContent) {
          situationData.summary = mapTextualContent['Summary'].join('. ');
        } else {
          situationData.summary = 'Summary n/a';
        }

        situationData.descriptions = [];
        if ('Description' in mapTextualContent) {
          situationData.descriptions = mapTextualContent['Description'];
        }

        situationData.details = [];
        const detailKeys = ['Consequence', 'Duration', 'Reason', 'Recommendation', 'Remark'];
        detailKeys.forEach(detailKey => {
          if (detailKey in mapTextualContent) {
            situationData.details = situationData.details.concat(mapTextualContent[detailKey]);
          }
        });

        const infoLink = publishingAction.passengerInformation.infoLink
        if (infoLink) {
          situationData.details.push(infoLink.label)
        }

        situationsData.push(situationData);
      });
    });

    const safeSituationsData = situationsData.map(el => {
      const safeEl: SituationContent = {
        summary: el.summary,
        descriptions: el.descriptions,
        // details might contain HTML, sanitize content
        safeDetails: el.details.map(detailS => {
          // HACK: always open in a new tab/window
          detailS = detailS.replace('<a href', '<a target="_blank" href');

          const textarea = document.createElement('textarea');
          textarea.innerHTML = detailS;
          const safeDetail = sanitizer.bypassSecurityTrustHtml(textarea.value);
          return safeDetail;
        }),
      };

      return safeEl;
    });

    return safeSituationsData;
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
      type: oldStopPoint.stopPointType,
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
      stopCall.place = OJP_Next.Place.initWithCoords(geoPosition.longitude, geoPosition.latitude);
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

  public static parseAnyPlaceResult(version: OJP_Next.OJP_VERSION, response: AnyLocationInformationRequestResponse): AnyPlaceResultSchema[] {
    const isOJPv2 = version === '2.0';

    let places: AnyPlaceResultSchema[] = [];
    
    if (isOJPv2) {
      const responseOJPv2 = response as OJP_Next.LocationInformationRequestResponse;
      if (responseOJPv2.ok) {
        places = places.concat(responseOJPv2.value.placeResult);
      }
    } else {
      const responseOJPv1 = response as OJP_Next.OJPv1_LocationInformationRequestResponse;
      if (responseOJPv1.ok) {
        places = places.concat(responseOJPv1.value.location);
      }
    }

    return places;
  }
}
