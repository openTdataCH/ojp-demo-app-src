import * as OJP from 'ojp-sdk';

import { LegStopPointData } from '../shared/components/service-stops.component';

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

      const delayMinutes = depArrTime.delayMinutes;
      if (delayMinutes) {
        const delayTextParts: string[] = []
        delayTextParts.push(' ')
        delayTextParts.push(delayMinutes > 0 ? '+' : '')
        delayTextParts.push('' + delayMinutes)
        delayTextParts.push("'");

        const delayTextS = delayTextParts.join('');

        if (isArr) {
          stopPointData.arrDelayText = delayTextS;
        } else {
          stopPointData.depDelayText = delayTextS;
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

  public static computeSituationsData(siriSituations: OJP.PtSituationElement[]): OJP.SituationContent[] {
    const situationsData: OJP.SituationContent[] = [];

    siriSituations.forEach(situation => {
      if (situation.situationContent !== null) {
        situationsData.push(situation.situationContent);
      }

      situation.publishingActions.forEach(publishingAction => {
        const mapTextualContent = publishingAction.passengerInformation.mapTextualContent;

        const situationData = <OJP.SituationContent>{};

      situationsData.push(situationData);
    });

    return situationsData;
  }
}
