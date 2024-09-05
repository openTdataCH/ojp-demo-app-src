import { AfterViewInit, Component, OnInit } from '@angular/core';

import * as OJP from 'ojp-sdk'

import { TripInfoService } from '../trip-info.service';
import { OJPHelpers } from '../../helpers/ojp-helpers';
import { LegStopPointData } from '../../shared/components/service-stops.component';

interface PageModel {
  tripInfoResult: OJP.TripInfoResult | null
  journeyRef: string
  serviceFromText: string
  serviceToText: string
  serviceIconPath: string
  serviceLineText: string
  serviceTripId: string
  serviceOperator: string
  stopPointsData: LegStopPointData[],
}

@Component({
  selector: 'trip-info-result',
  styleUrls: ['./trip-info-result.component.scss'],
  templateUrl: './trip-info-result.component.html',
})
export class TripInfoResultComponent implements OnInit, AfterViewInit {
  public model: PageModel

  constructor(private tripInfoService: TripInfoService) {
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

    this.model.journeyRef = service.journeyRef

    const fromStop = tripInfoResult.stopPoints[0];
    this.model.serviceFromText = fromStop.location.computeLocationName() ?? 'n/a (from)';

    const toStop = tripInfoResult.stopPoints[tripInfoResult.stopPoints.length - 1];
    this.model.serviceToText = toStop.location.computeLocationName() ?? 'n/a (from)';

    this.model.serviceLineText = service.serviceLineNumber ?? 'n/a (serviceLineNumber)';
    this.model.serviceTripId = service.journeyNumber ?? 'n/a (journeyNumber)';
    this.model.serviceOperator = service.agencyCode ?? 'n/a (agencyID)';

    const legIconFilename = OJPHelpers.computeIconFilenameForService(service);
    this.model.serviceIconPath = 'assets/pictograms/' + legIconFilename + '.png';

    this.model.stopPointsData = (() => {
      const stopPointsData: LegStopPointData[] = [];

      tripInfoResult.stopPoints.forEach(stopPoint => {
        const stopPointData = <LegStopPointData>{
          locationText: stopPoint.location.computeLocationName() ?? 'n/a',
        };

        OJPHelpers.updateLocationDataWithTime(stopPointData, stopPoint);

        stopPointsData.push(stopPointData);
      });

      return stopPointsData;
    })();
  }

  public onLocationSelected(locationData: LegStopPointData) {
    this.tripInfoService.locationSelected.emit(locationData);
  }
}
