import OJP_Legacy from '../config/ojp-legacy';

import { LegStopPointData } from '../shared/components/service-stops.component';
import { DEBUG_LEVEL } from '../config/constants';
import { SituationContent } from '../shared/types/situations';
import { DomSanitizer } from '@angular/platform-browser';

type PublicTransportPictogram = 'picto-bus' | 'picto-railway' | 'picto-tram' | 'picto-rack-railway' | 'picto-funicular' | 'picto-cablecar' | 'picto-gondola' | 'picto-chairlift' | 'picto-boat' | 'car-sharing' | 'picto-bus-fallback' | 'autozug';

export class OJPHelpers {
  public static computeIconFilenameForService(service: OJP_Legacy.JourneyService): string {
    return OJPHelpers.computePublicTransportPictogram(service.ptMode);
  }

  private static computePublicTransportPictogram(ptMode: OJP_Legacy.PublicTransportMode): PublicTransportPictogram {
    if (ptMode.ptMode === 'bus') {
      return 'picto-bus';
    }

    if (ptMode.shortName === 'ATZ') {
      return 'autozug';
    }

    if (ptMode.isRail()) {
      return 'picto-railway';
    }

    if (ptMode.ptMode === 'tram') {
      return 'picto-tram';
    }

    // ojp:PtMode === funicular
    if (ptMode.shortName === 'CC') {
      return 'picto-rack-railway';
    }
    
    // ojp:PtMode === telecabin
    if (ptMode.shortName === 'FUN') {
      return 'picto-funicular';
    }
    if (ptMode.shortName === 'PB') {
      return 'picto-cablecar';
    }
    if (ptMode.shortName === 'GB') {
      return 'picto-gondola';
    }
    if (ptMode.shortName === 'SL') {
      return 'picto-chairlift';
    }

    if (ptMode.ptMode === 'water') {
      return 'picto-boat';
    }

    if (ptMode.isDemandMode) {
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
      const service = OJPHelpers.computeIconFilenameForService(timdLeg.service);
      return service;
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

  public static updateLocationDataWithTime(stopPointData: LegStopPointData, stopPoint: OJP_Legacy.StopPoint, isLastStop: boolean = false) {
    const depArrTypes: OJP_Legacy.TripRequestBoardingType[] = ['Arr', 'Dep'];

    depArrTypes.forEach(depArrType => {
      const isArr = depArrType === 'Arr';
      const depArrTime = isArr ? stopPoint.arrivalData : stopPoint.departureData;
      if (depArrTime === null) {
        return;
      }

      const depArrTimeS = OJP_Legacy.DateHelpers.formatTimeHHMM(depArrTime.timetableTime);
      if (isArr) {
        stopPointData.arrText = depArrTimeS;
      } else {
        stopPointData.depText = depArrTimeS;
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

    stopPointData.platformText = stopPoint.plannedPlatform;
    stopPointData.actualPlatformText = stopPoint.actualPlatform;

    // Dont propagate changes if the platform didnt change
    if (stopPointData.actualPlatformText !== null && (stopPointData.platformText === stopPointData.actualPlatformText)) {
      stopPointData.actualPlatformText = null;
    }

    stopPointData.geoPosition = stopPoint.location.geoPosition;

    stopPointData.isNotServicedStop = stopPoint.isNotServicedStop === true;

    stopPointData.occupancy = {
      firstClassIcon: OJPHelpers.computeOccupancyLevelIcon(stopPoint, 'firstClass'),
      firstClassText: OJPHelpers.computeOccupancyLevelText(stopPoint, 'firstClass'),
      secondClassIcon: OJPHelpers.computeOccupancyLevelIcon(stopPoint, 'secondClass'),
      secondClassText: OJPHelpers.computeOccupancyLevelText(stopPoint, 'secondClass'),
    };
  }

  private static computeStopPointDelayText(depArrType: OJP_Legacy.TripRequestBoardingType, stopPoint: OJP_Legacy.StopPoint): string | null {
    const isArr = depArrType === 'Arr';
    const depArrTime = isArr ? stopPoint.arrivalData : stopPoint.departureData;
    if (depArrTime === null) {
      return null;
    }

    if (depArrTime.estimatedTime === null) {
      return null;
    }
      
    const dateDiffSeconds = (depArrTime.estimatedTime.getTime() - depArrTime.timetableTime.getTime()) / 1000;
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
      const delayMinutes = depArrTime.delayMinutes;
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

  public static formatServiceName(service: OJP_Legacy.JourneyService): string {
    const nameParts: string[] = [];

    if (service.serviceLineNumber) {
      if (!service.ptMode.isRail()) {
        nameParts.push(service.ptMode.shortName ?? service.ptMode.ptMode);
      }

      nameParts.push(service.serviceLineNumber);
      nameParts.push(service.journeyNumber ?? '');
    } else {
      nameParts.push(service.ptMode.shortName ?? service.ptMode.ptMode);
    }

    nameParts.push('(' + service.operatorRef + ')');

    return nameParts.join(' ');
  }

  public static computePlatformAssistanceIconPath(stopPoint: OJP_Legacy.StopPoint): string | null {
    const filename: string | null = (() => {
      if (stopPoint.vehicleAccessType === 'PLATFORM_ACCESS_WITHOUT_ASSISTANCE') {
        return 'platform_independent';
      }

      if (stopPoint.vehicleAccessType === 'PLATFORM_ACCESS_WITH_ASSISTANCE') {
        return 'platform_help_driver';
      }

      if (stopPoint.vehicleAccessType === 'PLATFORM_ACCESS_WITH_ASSISTANCE_WHEN_NOTIFIED') {
        return 'platform_advance_notice';
      }

      if (stopPoint.vehicleAccessType === 'PLATFORM_NOT_WHEELCHAIR_ACCESSIBLE') {
        return 'platform_not_possible';
      }

      if (stopPoint.vehicleAccessType === 'NO_DATA') {
        return 'platform_no_information';
      }

      if (stopPoint.vehicleAccessType === 'ALTERNATIVE_TRANSPORT') {
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

  public static computePlatformAssistanceTooltip(stopPoint: OJP_Legacy.StopPoint): string {
    const message: string = (() => {
      if (stopPoint.vehicleAccessType === 'PLATFORM_ACCESS_WITHOUT_ASSISTANCE') {
        return 'Step-free access; level entry/exit.';
      }

      if (stopPoint.vehicleAccessType === 'PLATFORM_ACCESS_WITH_ASSISTANCE') {
        return 'Step-free access; entry/exit through staff assistance, no prior registration necessary.';
      }

      if (stopPoint.vehicleAccessType === 'PLATFORM_ACCESS_WITH_ASSISTANCE_WHEN_NOTIFIED') {
        return 'Step-free access; entry/exit through staff assistance, advance registration required.';
      }

      if (stopPoint.vehicleAccessType === 'PLATFORM_NOT_WHEELCHAIR_ACCESSIBLE') {
        return 'Not usable for wheelchairs.';
      }

      if (stopPoint.vehicleAccessType === 'ALTERNATIVE_TRANSPORT') {
        return 'By shuttle from/to the accessible stop, register in advance.';
      }

      return 'No available information about vehicle access.';
    })();

    return message;
  }

  private static computeOccupancyLevelIcon(stopPoint: OJP_Legacy.StopPoint, fareClassType: OJP_Legacy.FareClassType): string | null {
    const occupancyLevel = stopPoint.mapFareClassOccupancy[fareClassType] ?? null;
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

  private static computeOccupancyLevelText(stopPoint: OJP_Legacy.StopPoint, fareClassType: OJP_Legacy.FareClassType): string {
    const defaultText = 'No forecast available';

    const occupancyLevel = stopPoint.mapFareClassOccupancy[fareClassType] ?? null;
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
}
