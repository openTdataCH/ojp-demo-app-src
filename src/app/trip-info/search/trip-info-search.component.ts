import { Component, OnInit, ViewChild } from '@angular/core';

import { SbbExpansionPanel } from '@sbb-esta/angular/accordion';
import { SbbDialog } from '@sbb-esta/angular/dialog';
import { SbbNotificationToast } from '@sbb-esta/angular/notification-toast';

import * as OJP from 'ojp-sdk';

import { APP_STAGE, APP_STAGEs, DEFAULT_APP_STAGE, OJP_VERSION } from '../../config/constants';

import { UserTripService } from '../../shared/services/user-trip.service';
import { TripInfoService } from '../trip-info.service';
import { DebugXmlPopoverComponent } from '../../search-form/debug-xml-popover/debug-xml-popover.component';
import { CustomTripInfoXMLPopoverComponent } from './custom-trip-info-xml-popover/custom-trip-info-xml-popover.component';
import { LanguageService } from '../../shared/services/language.service';
import { TripInfoResult } from '../../shared/models/trip-info-result';
import { OJPHelpers } from '../../helpers/ojp-helpers';

interface PagelModel {
  currentAppStage: APP_STAGE,

  journeyRef: string
  journeyDateTime: Date,
  appStageOptions: APP_STAGE[],
  isSearching: boolean,
  
  otherVersionURL: string | null,
  permalinkURLAddress: string,
}

@Component({
  selector: 'trip-info-search',
  templateUrl: './trip-info-search.component.html',
  styleUrls: ['./trip-info-search.component.scss']
})
export class TripInfoSearchComponent implements OnInit {
  @ViewChild(SbbExpansionPanel, { static: true }) searchPanel: SbbExpansionPanel | undefined;

  private queryParams: URLSearchParams;

  public model: PagelModel;

  public currentRequestInfo: OJP.RequestInfo | null;

  public headerText: string = 'Search Trip Info';

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
      currentAppStage: DEFAULT_APP_STAGE,

      journeyRef: '',
      journeyDateTime: new Date(),
      appStageOptions: APP_STAGEs,
      isSearching: false,

      otherVersionURL: null,
      permalinkURLAddress: '',
    }

    this.updateURLs();

    this.currentRequestInfo = null;

    const queryParams = new URLSearchParams(document.location.search);
    
    this.useMocks = queryParams.get('use_mocks') === 'yes';
  }

  ngOnInit(): void {
    const appStage = OJPHelpers.computeAppStage();

    setTimeout(() => {
      // HACK 
      // without the setTimeout , the parent src/app/station-board/station-board.component.html template 
      // gives following errors core.mjs:9157 ERROR RuntimeError: NG0100: ExpressionChangedAfterItHasBeenCheckedError: 
      // Expression has changed after it was checked. Previous value: 'PROD'. Current value: 'INT'. 
      // Find more at https://angular.io/errors/NG0100
      this.userTripService.currentAppStage = appStage;
    });

    this.model.currentAppStage = appStage;
    this.userTripService.updateAppStage(appStage);

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

      this.updateURLs();
      
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
    this.updateURLs();
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

  private updateURLs() {
    const queryParams = new URLSearchParams();
    queryParams.set('ref', this.model.journeyRef);
    
    const dayS = OJP.DateHelpers.formatDate(this.model.journeyDateTime).substring(0, 10);
    queryParams.set('day', dayS);

    if (this.model.currentAppStage !== DEFAULT_APP_STAGE) {
      const stageS = this.model.currentAppStage.toLowerCase();
      queryParams.append('stage', stageS);
    }

    const urlAddress = document.location.pathname + '?' + queryParams.toString();
    
    this.model.permalinkURLAddress = urlAddress;
    this.updateLinkedURLs(queryParams);
  }

  private updateLinkedURLs(queryParams: URLSearchParams) {
    const isOJPv2 = OJP_VERSION === '2.0';

    const otherVersionQueryParams = new URLSearchParams(queryParams);
    this.userTripService.updateStageLinkedURL(otherVersionQueryParams, isOJPv2);
    if (isOJPv2) {
      // v1
      this.model.otherVersionURL = 'https://tools.odpch.ch/beta-ojp-demo/trip?' + otherVersionQueryParams.toString();
      this.userTripService.otherVersionURLText = 'BETA (OJP 1.0)';
    } else {
      // v2
      this.model.otherVersionURL = 'https://opentdatach.github.io/ojp-demo-app/trip?' + otherVersionQueryParams.toString();
      this.userTripService.otherVersionURLText = 'PROD (OJP 2.0)';
    }
  }

  private async fetchTripInfo() {
    const ojpSDK = this.userTripService.createOJP_SDK_Instance(this.languageService.language);

    const request = ojpSDK.requests.TripInfoRequest.initWithJourneyRef(this.model.journeyRef, this.model.journeyDateTime);
    request.enableTrackProjection();

    this.model.isSearching = true;
    const response = await request.fetchResponse(ojpSDK);
    this.model.isSearching = false;

    if (response.ok) {
      const tripInfoResult = TripInfoResult.initWithTripInfoResponse(OJP_VERSION, response);
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

  private parseTripInfo(requestInfo: OJP.RequestInfo, tripInfoResult: TripInfoResult | null): void {
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
        dialogRef.close();
        this.currentRequestInfo = requestInfo;

        if (requestInfo.responseXML) {
          await this.handleCustomResponse(requestInfo.responseXML);
        }
      });

      popover.customResponseSaved.subscribe((responseXML) => {
        dialogRef.close()
        this.handleCustomResponse(responseXML);
      })
    });
  }

  private async handleCustomResponse(responseXML: string) {
    const ojpSDK = this.userTripService.createOJP_SDK_Instance(this.languageService.language);

    const request = ojpSDK.requests.TripInfoRequest.initWithResponseMock(responseXML);
    request.enableTrackProjection();
   
    this.currentRequestInfo = request.requestInfo;
    
    const response = await request.fetchResponse(ojpSDK);
    if (response.ok) {
      const tripInfoResult = TripInfoResult.initWithTripInfoResponse(OJP_VERSION, response);
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
}
