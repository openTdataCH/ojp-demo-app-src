import { Component, OnInit } from '@angular/core';

import { AppService } from '../shared/services/app.service';
import { DEFAULT_APP_STAGE, OJP_VERSION } from '../config/constants';
import { TripInfoService } from './trip-info.service';
import { OJPHelpers } from '../helpers/ojp-helpers';
import { UserTripService } from '../shared/services/user-trip.service';

@Component({
  selector: 'trip-info',
  templateUrl: './trip-info.component.html',
  styleUrls: ['./trip-info.component.scss'],
})
export class TripInfoComponent implements OnInit {
  public routeQueryParams: Record<string, string>;

  constructor(private appService: AppService, private userTripService: UserTripService, private tripInfoService: TripInfoService) {
    this.routeQueryParams = {};
  }

  ngOnInit(): void {
    const sectionTitle = 'TripInfoRequest';
    this.appService.updatePageTitle(sectionTitle, this.userTripService.currentAppStage);

    this.tripInfoService.stageChanged.subscribe(newStage => {
      const queryParams = new URLSearchParams(this.routeQueryParams);

      if (newStage === DEFAULT_APP_STAGE) {
        if (queryParams.get('stage') !== null) {
          queryParams.delete('stage');
        }
      } else {
        queryParams.set('stage', newStage);
      }

      this.appService.updatePageTitle(sectionTitle, this.userTripService.currentAppStage);

      this.updateRouteQueryParams(queryParams);
    });
  }

  private updateRouteQueryParams(queryParams: URLSearchParams) {
    const isOJPv1 = OJP_VERSION === '1.0';
    if (isOJPv1) {
      queryParams.set('v', '1');
    }

    this.routeQueryParams = Object.fromEntries(queryParams.entries());
  }

  public onActiveTabClick(): void {
    OJPHelpers.resetTabNavigation('trip');
  }
}
