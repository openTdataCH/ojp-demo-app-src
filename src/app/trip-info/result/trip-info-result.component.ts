import { AfterViewInit, ChangeDetectorRef, Component, OnInit } from '@angular/core';

import OJP_Legacy from '../../config/ojp-legacy';

import { TripInfoService } from '../trip-info.service';
import { OJPHelpers } from '../../helpers/ojp-helpers';
import { LegStopPointData } from '../../shared/components/service-stops.component';
import { UserTripService } from '../../shared/services/user-trip.service';
import { DEFAULT_APP_STAGE } from 'src/app/config/constants';
import { TripInfoResult } from '../../shared/models/trip-info-result';

interface PageModel {
  tripInfoResult: TripInfoResult | null
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
  permalinkURL: string,
}

@Component({
  selector: 'trip-info-result',
  styleUrls: ['./trip-info-result.component.scss'],
  templateUrl: './trip-info-result.component.html',
})
export class TripInfoResultComponent implements OnInit, AfterViewInit {
  public model: PageModel;

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

  private updatePageModel(tripInfoResult: TripInfoResult | null) {
    this.model.tripInfoResult = tripInfoResult;

    if (tripInfoResult === null) {
      return;
    }

    const service = tripInfoResult.service ?? null;
    if (service === null) {
      return;
    }

    if (tripInfoResult.calls.length < 2) {
      return;
    }

    this.model.journeyRef = service.journeyRef;
    this.model.operatingDayRef = service.operatingDayRef ?? 'n/a (serviceDay)';

    const fromStop = tripInfoResult.calls[0];
    this.model.serviceFromText = fromStop.stopPointName;

    const toStop = tripInfoResult.calls[tripInfoResult.calls.length - 1];
    this.model.serviceToText = toStop.stopPointName;

    this.model.serviceLineText = service.publishedServiceName.text ?? 'n/a (serviceLineNumber)';
    this.model.serviceTripId = service.trainNumber ?? 'n/a (journeyNumber)';
    this.model.serviceOperator = service.operatorRef ?? 'n/a (operatorRef)';

    const legIconFilename = OJPHelpers.computeIconFilenameForService(service);
    this.model.serviceIconPath = 'assets/pictograms/' + legIconFilename + '.png';

    this.model.stopPointsData = (() => {
      const stopPointsData: LegStopPointData[] = [];

      tripInfoResult.calls.forEach(stopPoint => {
        const stopPointData = <LegStopPointData>{
          locationText: stopPoint.stopPointName,
        };

        OJPHelpers.updateLocationDataWithTime(stopPointData, stopPoint);
        stopPointData.platformAssistanceIconPath = OJPHelpers.computePlatformAssistanceIconPath(stopPoint.vehicleAccessType);
        stopPointData.platformAssistanceTooltip = OJPHelpers.computePlatformAssistanceTooltip(stopPoint.vehicleAccessType);

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

    const stopPoints = this.model.tripInfoResult.calls;
    const fromStopPoint = stopPoints[locationIDXs[0]];
    const toStopPoint = stopPoints[locationIDXs[1]];
    
    const queryParams = new URLSearchParams();
    queryParams.set('from', fromStopPoint.stopPointRef);
    queryParams.set('to', toStopPoint.stopPointRef);

    if (this.userTripService.currentAppStage !== DEFAULT_APP_STAGE) {
      queryParams.set('stage', this.userTripService.currentAppStage);
    }

    const nowDateF = OJP_Legacy.DateHelpers.formatDate(new Date());
    const nowDayF = nowDateF.substring(0, 10);
    if (this.model.operatingDayRef !== nowDayF) {
      queryParams.set('day', this.model.operatingDayRef);
    }

    queryParams.set('do_search', 'yes');

    this.model.journeyExampleURL = './search?' + queryParams.toString();
    
    const fromStopPointName = fromStopPoint.stopPointName;
    const toStopPointName = toStopPoint.stopPointName;
    this.model.journeyExampleCaption = fromStopPointName + ' -> ' + toStopPointName;
    
    this.updateURLs();

    // otherwise we get ExpressionChangedAfterItHasBeenCheckedError
    this.cdr.detectChanges();
  }

  private updateURLs() {
    this.model.permalinkURL = './trip?ref=' + this.model.journeyRef + '&stage=' + this.userTripService.currentAppStage;
  }
}
