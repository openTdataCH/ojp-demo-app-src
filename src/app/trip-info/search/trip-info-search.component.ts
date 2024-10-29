import { Component, OnInit, ViewChild } from '@angular/core';

import { SbbExpansionPanel } from '@sbb-esta/angular/accordion';
import { SbbDialog } from '@sbb-esta/angular/dialog';
import { SbbNotificationToast } from '@sbb-esta/angular/notification-toast';

import * as OJP from 'ojp-sdk'

import { APP_STAGE, DEBUG_LEVEL } from '../../config/app-config'

import { UserTripService } from 'src/app/shared/services/user-trip.service';
import { TripInfoService } from '../trip-info.service';
import { DebugXmlPopoverComponent } from '../../search-form/debug-xml-popover/debug-xml-popover.component';
import { CustomTripInfoXMLPopoverComponent } from './custom-trip-info-xml-popover/custom-trip-info-xml-popover.component';
import { LanguageService } from 'src/app/shared/services/language.service';

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

  public currentRequestInfo: OJP.RequestInfo | null;

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
      appStageOptions: ['PROD', 'INT', 'TEST', 'LA Beta'],
      isSearching: false,
      permalinkURLAddress: '',
    }

    if (DEBUG_LEVEL === 'DEBUG') {
      this.model.appStageOptions.push('OJP-SI');
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
        this.userTripService.updateAppStage(newAppStage)
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

      this.fetchTripInfo();
    }


    if (this.useMocks) {
      if (this.useMocks && document.location.hostname === 'localhost') {
        this.fetchStopEventFromMocks();
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
    
    const dayS =  OJP.DateHelpers.formatDate(this.model.journeyDateTime).substring(0, 10);
    queryParams.set('day', dayS);

    const urlAddress = document.location.pathname + '?' + queryParams.toString();
    
    this.model.permalinkURLAddress = urlAddress;
  }

  private async fetchTripInfo() {
    const stageConfig = this.userTripService.getStageConfig();
    const dayRef = OJP.DateHelpers.formatDate(this.model.journeyDateTime).substring(0, 10);
    const request = OJP.TripInfoRequest.initWithJourneyRef(stageConfig, this.languageService.language, this.model.journeyRef, dayRef);
    this.model.isSearching = true;
    const response = await request.fetchResponse();

    this.model.isSearching = false;

    if (response.tripInfoResult === null) {
      this.notificationToast.open('Invalid TripInfoRequest result', {
        type: 'error',
        verticalPosition: 'top',
      });

      console.log(this.model.journeyRef);
    }

    this.parseTripInfo(request.requestInfo, response.tripInfoResult);
  }

  private async fetchStopEventFromMocks() {
    const mockURL = '/path/to/mock.xml';

    const mockText = await (await fetch(mockURL)).text();
    const request = OJP.TripInfoRequest.initWithMock(mockText);
    request.fetchResponse().then(response => {
      this.parseTripInfo(request.requestInfo, response.tripInfoResult);
    });
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

  private parseTripInfo(requestInfo: OJP.RequestInfo, tripInfoResult: OJP.TripInfoResult | null): void {
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

      popover.customRequestSaved.subscribe(request => {
        dialogRef.close()
        this.currentRequestInfo = request.requestInfo;

        if (request.requestInfo.requestXML) {
          this.handleCustomResponse(request.requestInfo.requestXML);
        }
      })

      popover.customResponseSaved.subscribe((responseXML) => {
        dialogRef.close()
        this.handleCustomResponse(responseXML);
      })
    });
  }

  private handleCustomResponse(responseXML: string) {
    if (this.currentRequestInfo === null) {
      return;
    }

    this.currentRequestInfo.responseDateTime = new Date();
    this.currentRequestInfo.responseXML = responseXML;

    const request = OJP.TripInfoRequest.initWithMock(responseXML);
    request.fetchResponse().then(response => {
      this.parseTripInfo(request.requestInfo, response.tripInfoResult);
    });
  }
}
