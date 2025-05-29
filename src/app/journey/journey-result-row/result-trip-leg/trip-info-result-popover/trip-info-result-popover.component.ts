import { Component } from '@angular/core';

import OJP_Legacy from '../../../../config/ojp-legacy';
import * as OJP_Next from 'ojp-sdk-next';

import { UserTripService } from '../../../../shared/services/user-trip.service';
import { TripInfoService } from '../../../../trip-info/trip-info.service';
import { LanguageService } from '../../../../shared/services/language.service'
import { REQUESTOR_REF } from '../../../../config/constants';
import { TripInfoResult } from '../../../../shared/models/trip-info-result';

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

  public async fetchJourneyRef(journeyRef: string, journeyDateTime: Date) {
    this.model.title = 'JourneyRef: ' + journeyRef;

    const request = OJP_Next.TripInfoRequest.initWithJourneyRef(journeyRef, journeyDateTime);
    request.enableTrackProjection();

    const ojpSDK_Next = this.createOJP_SDK_Instance();

    this.model.isFetching = true;
    const response = await ojpSDK_Next.fetchTripInfoRequestResponse(request);
    this.model.isFetching = false;

    if (response.ok) {
      const tripInfoResult = TripInfoResult.initWithTripInfoDeliverySchema(response.value);
      this.tripInfoService.tripInfoResultUpdated.emit(tripInfoResult);
    } else {
      console.error('fetchJourneyRef - error');
      console.log(journeyRef);
      console.log(response);
      this.model.errorMessage = 'ERROR while fetching the TripInfoRequest, check console for more details.';

      this.tripInfoService.tripInfoResultUpdated.emit(null);
    }
  }

  private createOJP_SDK_Instance(): OJP_Next.SDK {
    const stageConfig = this.userTripService.getStageConfig();    
    const sdk = new OJP_Next.SDK(REQUESTOR_REF, stageConfig, this.languageService.language, OJP_Legacy.XML_BuilderConfig);
    return sdk;
  }
}
