import { AfterViewInit, ChangeDetectorRef, Component, OnInit } from '@angular/core';

import * as OJP from 'ojp-sdk'

import { TripInfoService } from '../trip-info.service';
import { OJPHelpers } from '../../helpers/ojp-helpers';
import { LegStopPointData } from '../../shared/components/service-stops.component';
import { UserTripService } from '../../shared/services/user-trip.service';
import { DEFAULT_APP_STAGE } from 'src/app/config/constants';

interface PageModel {
  tripInfoResult: OJP.TripInfoResult | null
  journeyRef: string
  operatingDayRef: string
  serviceFromText: string
  serviceToText: string
  serviceIconPath: string
  serviceLineText: string
  serviceTripId: string
  serviceOperator: string
  stopPointsData: LegStopPointData[],
  
  journeyExampleURL: string,
  journeyExampleCaption: string,
}

@Component({
  selector: 'trip-info-result',
  styleUrls: ['./trip-info-result.component.scss'],
  templateUrl: './trip-info-result.component.html',
})
export class TripInfoResultComponent implements OnInit, AfterViewInit {
  public model: PageModel

  constructor(private tripInfoService: TripInfoService, private userTripService: UserTripService, private cdr: ChangeDetectorRef) {
    this.model = <PageModel>{}
    
    this.model.tripInfoResult = null;
    this.model.stopPointsData = [];
  }

  ngOnInit(): void {
    this.tripInfoService.tripInfoResultUpdated.subscribe(tripInfoResult => {
      this.updatePageModel(tripInfoResult);
    })
  }

  ngAfterViewInit(): void {

  }

  private updatePageModel(tripInfoResult: OJP.TripInfoResult | null) {
    this.model.tripInfoResult = tripInfoResult;

    if (tripInfoResult === null) {
      return;
    }

    const service = tripInfoResult.service ?? null;
    if (service === null) {
      return;
    }

    if (tripInfoResult.stopPoints.length < 2) {
      return;
    }

    this.model.journeyRef = service.journeyRef;
    this.model.operatingDayRef = service.operatingDayRef ?? 'n/a (serviceDay)';

    const fromStop = tripInfoResult.stopPoints[0];
    this.model.serviceFromText = fromStop.location.computeLocationName() ?? 'n/a (from)';

    const toStop = tripInfoResult.stopPoints[tripInfoResult.stopPoints.length - 1];
    this.model.serviceToText = toStop.location.computeLocationName() ?? 'n/a (from)';

    this.model.serviceLineText = service.serviceLineNumber ?? 'n/a (serviceLineNumber)';
    this.model.serviceTripId = service.journeyNumber ?? 'n/a (journeyNumber)';
    this.model.serviceOperator = service.agencyID ?? 'n/a (agencyID)';

    const legIconFilename = OJPHelpers.computeIconFilenameForService(service);
    this.model.serviceIconPath = 'assets/pictograms/' + legIconFilename + '.png';

    this.model.stopPointsData = (() => {
      const stopPointsData: LegStopPointData[] = [];

      tripInfoResult.stopPoints.forEach(stopPoint => {
        const stopPointData = <LegStopPointData>{
          locationText: stopPoint.location.computeLocationName() ?? 'n/a',
        };

        OJPHelpers.updateLocationDataWithTime(stopPointData, stopPoint);

        stopPointData.platformAssistanceIconPath = OJPHelpers.computePlatformAssistanceIconPath(stopPoint);
        stopPointData.platformAssistanceTooltip = OJPHelpers.computePlatformAssistanceTooltip(stopPoint);

        stopPointsData.push(stopPointData);
      });

      return stopPointsData;
    })();
  }

  public onLocationSelected(locationData: LegStopPointData) {
    this.tripInfoService.locationSelected.emit(locationData);
  }

  public onExampleTripLocationsUpdated(locationIDXs: number[]) {
    if (this.model.tripInfoResult === null) {
      return;
    }

    if (locationIDXs.length != 2) {
      console.error('ERROR: expected 2 items only');
      console.log(locationIDXs);
      return;
    }

    locationIDXs = locationIDXs.slice();
    // sort the ids, first location is the departure
    locationIDXs.sort((a, b) => a - b);

    const stopPoints = this.model.tripInfoResult.stopPoints;

    const fromLocation = stopPoints[locationIDXs[0]].location;
    const toLocation = stopPoints[locationIDXs[1]].location;
    
    const queryParams = new URLSearchParams();
    const fromRef = fromLocation.stopPlace?.stopPlaceRef ?? null;
    const toRef = toLocation.stopPlace?.stopPlaceRef ?? null;
    if (fromRef === null || toRef === null) {
      return;
    }

    queryParams.set('from', fromRef);
    queryParams.set('to', toRef);

    if (this.userTripService.currentAppStage !== DEFAULT_APP_STAGE) {
      queryParams.set('stage', this.userTripService.currentAppStage);
    }

    const nowDateF = OJP.DateHelpers.formatDate(new Date());
    const nowDayF = nowDateF.substring(0, 10);
    if (this.model.operatingDayRef !== nowDayF) {
      queryParams.set('day', this.model.operatingDayRef);
    }

    queryParams.set('do_search', 'yes');

    this.model.journeyExampleURL = './search?' + queryParams.toString();
    this.model.journeyExampleCaption = fromLocation.computeLocationName() + ' -> ' + toLocation.computeLocationName();

    // otherwise we get ExpressionChangedAfterItHasBeenCheckedError
    this.cdr.detectChanges();
  }
}
