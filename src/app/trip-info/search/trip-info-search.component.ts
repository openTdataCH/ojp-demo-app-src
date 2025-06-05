import { Component, OnInit, ViewChild } from '@angular/core';

import { SbbExpansionPanel } from '@sbb-esta/angular/accordion';
import { SbbDialog } from '@sbb-esta/angular/dialog';
import { SbbNotificationToast } from '@sbb-esta/angular/notification-toast';

import OJP_Legacy from '../../config/ojp-legacy';
import * as OJP_Next from 'ojp-sdk-next';

import { APP_STAGE, APP_STAGEs, OJP_VERSION, REQUESTOR_REF } from '../../config/constants'

import { UserTripService } from '../../shared/services/user-trip.service';
import { TripInfoService } from '../trip-info.service';
import { DebugXmlPopoverComponent } from '../../search-form/debug-xml-popover/debug-xml-popover.component';
import { CustomTripInfoXMLPopoverComponent } from './custom-trip-info-xml-popover/custom-trip-info-xml-popover.component';
import { LanguageService } from '../../shared/services/language.service';
import { TripInfoResult } from '../../shared/models/trip-info-result';

interface PagelModel {
  journeyRef: string
  journeyDateTime: Date,
  appStageOptions: APP_STAGE[],
  isSearching: boolean,
  permalinkURLAddress: string
}

@Component({
  selector: 'trip-info-search',
  templateUrl: './trip-info-search.component.html',
  styleUrls: ['./trip-info-search.component.scss']
})
export class TripInfoSearchComponent implements OnInit {
  @ViewChild(SbbExpansionPanel, { static: true }) searchPanel: SbbExpansionPanel | undefined;

  private queryParams: URLSearchParams

  public model: PagelModel

  public currentRequestInfo: OJP_Next.RequestInfo | null;

  public headerText: string = 'Search Trip Info'

  private useMocks = false;

  constructor(
    private notificationToast: SbbNotificationToast,
    private debugXmlPopover: SbbDialog,
    private customXmlPopover: SbbDialog,
    private tripInfoService: TripInfoService,
    private languageService: LanguageService,
    public userTripService: UserTripService,
  ) {
    this.queryParams = new URLSearchParams(document.location.search);

    this.model = {
      journeyRef: '',
      journeyDateTime: new Date(),
      appStageOptions: APP_STAGEs,
      isSearching: false,
      permalinkURLAddress: '',
    }

    this.updatePermalinkURLAddress();

    this.currentRequestInfo = null;

    const queryParams = new URLSearchParams(document.location.search);
    
    this.useMocks = queryParams.get('use_mocks') === 'yes';
  }

  ngOnInit(): void {
    const userStage = this.queryParams.get('stage');
    if (userStage) {
      const newAppStage = this.computeAppStageFromString(userStage);
      if (newAppStage) {
        setTimeout(() => {
          // HACK 
          // without the setTimeout , the parent src/app/trip-info/trip-info.component.html template 
          // gives following errors core.mjs:9157 ERROR RuntimeError: NG0100: ExpressionChangedAfterItHasBeenCheckedError: 
          // Expression has changed after it was checked. Previous value: 'PROD'. Current value: 'INT'. 
          // Find more at https://angular.io/errors/NG0100
          this.userTripService.updateAppStage(newAppStage);
        });
      }
    }

    this.tripInfoService.tripInfoResultUpdated.subscribe(tripInfoResult => {
      if (tripInfoResult !== null) {
        this.searchPanel?.close();
      }
    });
    
    this.initFromUserVars();
  }

  private initFromUserVars() {
    const journeyRef = this.queryParams.get('ref');
    if (journeyRef) {
      this.model.journeyRef = journeyRef;

      const dayRef = this.queryParams.get('day');
      if (dayRef) {
        this.model.journeyDateTime = new Date(dayRef);
      }
      
      this.fetchTripInfo();
    }

    if (this.useMocks) {
      if (this.useMocks && document.location.hostname === 'localhost') {
        this.fetchTripInfoRequestFromMocks();
        return;
      }
    }
  }

  private computeAppStageFromString(appStageS: string): APP_STAGE | null {
    const availableStagesLower: string[] = this.model.appStageOptions.map(stage => {
      return stage.toLowerCase();
    });

    const appStage = appStageS.trim() as APP_STAGE;
    const stageIDX = availableStagesLower.indexOf(appStage.toLowerCase());
    if (stageIDX !== -1) {
      return this.model.appStageOptions[stageIDX];
    }

    return null;
  }

  public onDateTimeChanged() {
    this.updatePermalinkURLAddress();
  }

  public isSearchButtonDisabled(): boolean {
    if (this.model.isSearching) {
      return true;
    }

    return false;
  }

  public searchButtonClicked() {
    this.notificationToast.dismiss();

    this.fetchTripInfo();
  }

  private updatePermalinkURLAddress() {
    const queryParams = new URLSearchParams();
    queryParams.set('ref', this.model.journeyRef);
    
    const dayS =  OJP_Legacy.DateHelpers.formatDate(this.model.journeyDateTime).substring(0, 10);
    queryParams.set('day', dayS);

    const urlAddress = document.location.pathname + '?' + queryParams.toString();
    
    this.model.permalinkURLAddress = urlAddress;
  }

  private async fetchTripInfo() {
    const stageConfig = this.userTripService.getStageConfig();

    const request = OJP_Next.TripInfoRequest.initWithJourneyRef(this.model.journeyRef, this.model.journeyDateTime);
    request.enableTrackProjection();

    const ojpSDK_Next = this.createOJP_SDK_Instance();

    this.model.isSearching = true;
    const response = await ojpSDK_Next.fetchTripInfoRequestResponse(request);
    this.model.isSearching = false;

    if (response.ok) {
      const tripInfoResult = TripInfoResult.initWithTripInfoDeliverySchema(response.value);
      this.parseTripInfo(request.requestInfo, tripInfoResult);
    } else {
      this.notificationToast.open('Invalid TripInfoRequest result: ' + response.error.message, {
        type: 'error',
        verticalPosition: 'top',
      });

      console.log(this.model.journeyRef);
      console.log(response);
    }
  }

  private async fetchTripInfoRequestFromMocks() {
    const mockURL = '/path/to/mock.xml';

    const mockText = await (await fetch(mockURL)).text();

    await this.handleCustomResponse(mockText);
  }

  public showRequestXmlPopover() {
    const dialogRef = this.debugXmlPopover.open(DebugXmlPopoverComponent, {
      position: { top: '20px' },
      width: '50vw',
      height: '90vh',
    });
    dialogRef.afterOpened().subscribe(() => {
      if (this.currentRequestInfo) {
        const popover = dialogRef.componentInstance as DebugXmlPopoverComponent;
        popover.updateRequestData(this.currentRequestInfo);
      }
    });
  }

  private parseTripInfo(requestInfo: OJP_Next.RequestInfo, tripInfoResult: TripInfoResult | null): void {
    this.currentRequestInfo = requestInfo;
    this.tripInfoService.tripInfoResultUpdated.emit(tripInfoResult);
  }

  onChangeStageAPI(ev: any) {
    const newAppStage = ev.value as APP_STAGE;
    this.userTripService.updateAppStage(newAppStage)
  }

  public loadCustomXMLPopover() {
    const dialogRef = this.customXmlPopover.open(CustomTripInfoXMLPopoverComponent, {
      position: { top: '20px' },
    });
    dialogRef.afterOpened().subscribe(() => {
      this.notificationToast.dismiss();

      const popover = dialogRef.componentInstance as CustomTripInfoXMLPopoverComponent;

      popover.customRequestXMLs = this.currentRequestInfo?.requestXML ?? 'n/a';

      popover.customRequestSaved.subscribe(async requestInfo => {
        dialogRef.close()
        this.currentRequestInfo = requestInfo;

        if (requestInfo.requestXML) {
          await this.handleCustomResponse(requestInfo.requestXML);
        }
      })

      popover.customResponseSaved.subscribe((responseXML) => {
        dialogRef.close()
        this.handleCustomResponse(responseXML);
      })
    });
  }

  private async handleCustomResponse(responseXML: string) {
    const request = OJP_Next.TripInfoRequest.initWithResponseMock(responseXML);
    request.enableTrackProjection();

    const ojpSDK_Next = this.createOJP_SDK_Instance();
    const response = await ojpSDK_Next.fetchTripInfoRequestResponse(request);
    if (response.ok) {
      const tripInfoResult = TripInfoResult.initWithTripInfoDeliverySchema(response.value);
      this.parseTripInfo(request.requestInfo, tripInfoResult);
    } else {
      this.notificationToast.open('Invalid TripInfoRequest result: ' + response.error.message, {
        type: 'error',
        verticalPosition: 'top',
      });
      console.log(this.model);
      console.log(response);
    }
  }

  private createOJP_SDK_Instance(): OJP_Next.SDK {
    const isOJPv2 = OJP_VERSION === '2.0';
    const xmlConfig = isOJPv2 ? OJP_Legacy.XML_ConfigOJPv2 : OJP_Legacy.XML_BuilderConfigOJPv1;

    const stageConfig = this.userTripService.getStageConfig();    
    const sdk = new OJP_Next.SDK(REQUESTOR_REF, stageConfig, this.languageService.language, xmlConfig);
    return sdk;
  }
}
