import { Component, OnInit } from '@angular/core';

import { AppService } from '../../shared/services/app.service';
import { UserTripService } from '../../shared/services/user-trip.service';
import { DEFAULT_APP_STAGE } from '../../config/constants';
import { OJPHelpers } from '../../helpers/ojp-helpers';

@Component({
  selector: 'journey-search',
  templateUrl: './journey-search.component.html',
  styleUrls: ['./journey-search.component.scss'],
})
export class JourneySearchComponent implements OnInit {
  public queryParams: Record<string, string>;

  constructor(private appService: AppService, public userTripService: UserTripService) {
    this.queryParams = {};
  }

  ngOnInit(): void {
    const sectionTitle = 'TripRequest';
    this.appService.updatePageTitle(sectionTitle, this.userTripService.currentAppStage);

    this.userTripService.stageChanged.subscribe(newStage => {
      if (newStage !== DEFAULT_APP_STAGE) {
        this.queryParams['stage'] = newStage;
      }
      
      const currentQueryParams = new URLSearchParams(document.location.search);
      const userVersion = currentQueryParams.get('v');
      if (userVersion) {
        this.queryParams['v'] = userVersion;
      }

      this.appService.updatePageTitle(sectionTitle, this.userTripService.currentAppStage);
    });
  }

  public onActiveTabClick(): void {
    OJPHelpers.resetTabNavigation('search');
  }
}
