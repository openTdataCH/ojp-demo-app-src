import { Component } from '@angular/core';

import * as OJP from 'ojp-sdk-v1';

import { UserTripService } from '../../../../shared/services/user-trip.service';
import { TripInfoService } from '../../../../trip-info/trip-info.service';
import { LanguageService } from '../../../../shared/services/language.service'

interface PageModel {
  title: string,
  errorMessage: string | null,
  isFetching: boolean
}

@Component({
  selector: 'trip-info-result-popover',
  templateUrl: './trip-info-result-popover.component.html',
})
export class TripInfoResultPopoverComponent {
  public model: PageModel

  constructor(private userTripService: UserTripService, private tripInfoService: TripInfoService, private languageService: LanguageService) {
    this.model = <PageModel>{};

    this.model.title = 'TripInfoResult';
    this.model.errorMessage = null;
    this.model.isFetching = false;
  }

  public async fetchJourneyRef(journeyRef: string, dayRef: string) {
    this.model.title = 'JourneyRef: ' + journeyRef;

    const stageConfig = this.userTripService.getStageConfig();
    const request = OJP.TripInfoRequest.initWithJourneyRef(stageConfig, this.languageService.language, journeyRef, dayRef);

    this.model.isFetching = true;
    const response = await request.fetchResponse();
    this.model.isFetching = false;

    if (response.tripInfoResult === null) {
      console.error('fetchJourneyRef - error');
      console.log(journeyRef);
      this.model.errorMessage = 'ERROR while fetching the TripInfoRequest, check console for more details.';
      return;
    }

    this.tripInfoService.tripInfoResultUpdated.emit(response.tripInfoResult);
  }
}
