import { Component, OnInit } from '@angular/core';
import { AppService } from '../shared/services/app.service';
import { UserTripService } from '../shared/services/user-trip.service';
import { DEFAULT_APP_STAGE } from '../config/constants';

@Component({
  selector: 'trip-info',
  templateUrl: './trip-info.component.html',
  styleUrls: ['./trip-info.component.scss'],
})
export class TripInfoComponent implements OnInit {
  public queryParams: Record<string, string>;

  constructor(private appService: AppService, public userTripService: UserTripService) {
    this.queryParams = {};
  }

  ngOnInit(): void {
    this.appService.setTitle('TripInfoRequest');

    this.userTripService.stageChanged.subscribe(newStage => {
      if (newStage !== DEFAULT_APP_STAGE) {
        this.queryParams['stage'] = newStage;
      }

      const currentQueryParams = new URLSearchParams(document.location.search);
      const userVersion = currentQueryParams.get('v');
      if (userVersion) {
        this.queryParams['v'] = userVersion;
      }
    });
  }
}
