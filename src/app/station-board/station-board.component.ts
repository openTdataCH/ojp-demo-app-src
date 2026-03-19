import { Component, OnInit } from '@angular/core';

import { AppService } from '../shared/services/app.service';
import { DEFAULT_APP_STAGE, OJP_VERSION } from '../config/constants';
import { StationBoardService } from './station-board.service';

@Component({
  selector: 'station-board',
  templateUrl: './station-board.component.html',
  styleUrls: ['./station-board.component.scss'],
})
export class StationBoardComponent implements OnInit {
  public routeQueryParams: Record<string, string>;

  constructor(private appService: AppService, private stationBoardService: StationBoardService) {
    this.routeQueryParams = {};
  }

  ngOnInit(): void {
    this.appService.setTitle('StopEventRequest');

    this.stationBoardService.stageChanged.subscribe(newStage => {
      const queryParams = new URLSearchParams(this.routeQueryParams);

      if (newStage === DEFAULT_APP_STAGE) {
        if (queryParams.get('stage') !== null) {
          queryParams.delete('stage');
        }
      } else {
        queryParams.set('stage', newStage);
      }

      this.updateRouteQueryParams(queryParams);
    });

    this.updateRouteQueryParams(new URLSearchParams());
  }

  private updateRouteQueryParams(queryParams: URLSearchParams) {
    const isOJPv1 = OJP_VERSION === '1.0';
    if (isOJPv1) {
      queryParams.set('v', '1');
    }

    this.routeQueryParams = Object.fromEntries(queryParams.entries());
  }
}
