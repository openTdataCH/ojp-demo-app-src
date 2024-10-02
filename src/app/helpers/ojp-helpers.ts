import * as OJP from 'ojp-sdk';

import { LegStopPointData } from '../shared/components/service-stops.component';
import { DEBUG_LEVEL } from '../config/app-config';

export class OJPHelpers {
  public static computeIconFilenameForService(service: OJP.JourneyService): string {
    return service.ptMode.computePublicTransportPictogram();
  }

  public static computeIconFilenameForLeg(leg: OJP.TripLeg): string {
    if (leg.legType === 'TransferLeg') {
      return 'picto-walk';
    }

    if (leg.legType === 'TimedLeg') {
      const timdLeg = leg as OJP.TripTimedLeg;
      const service = OJPHelpers.computeIconFilenameForService(timdLeg.service);
      return service;
    }

    if (leg.legType === 'ContinousLeg') {
      const continousLeg = leg as OJP.TripContinousLeg;
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

  public static updateLocationDataWithTime(stopPointData: LegStopPointData, stopPoint: OJP.StopPoint, isLastStop: boolean = false) {
    const depArrTypes: OJP.TripRequestBoardingType[] = ['Arr', 'Dep'];

    depArrTypes.forEach(depArrType => {
      const isArr = depArrType === 'Arr';
      const depArrTime = isArr ? stopPoint.arrivalData : stopPoint.departureData;
      if (depArrTime === null) {
        return;
      }

      const depArrTimeS = OJP.DateHelpers.formatTimeHHMM(depArrTime.timetableTime);
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
  }

  private static computeStopPointDelayText(depArrType: OJP.TripRequestBoardingType, stopPoint: OJP.StopPoint): string | null {
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
    } else {
      delayTextParts.push('-');
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

  public static computeSituationsData(siriSituations: OJP.PtSituationElement[]): OJP.SituationContent[] {
    const situationsData: OJP.SituationContent[] = [];

    siriSituations.forEach(situation => {
      if (situation.situationContent !== null) {
        situationsData.push(situation.situationContent);
      }

      situation.publishingActions.forEach(publishingAction => {
        const mapTextualContent = publishingAction.passengerInformation.mapTextualContent;

        const situationData = <OJP.SituationContent>{};

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

        situationsData.push(situationData);
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
}
