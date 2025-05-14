import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';

import { SbbExpansionPanel } from '@sbb-esta/angular/accordion';
import { SbbDialog } from '@sbb-esta/angular/dialog';
import { SbbNotificationToast } from '@sbb-esta/angular/notification-toast';

import * as GeoJSON from 'geojson'
import OJP_Legacy from '../../config/ojp-legacy';

import { OJPHelpers } from '../../helpers/ojp-helpers';

import { UserTripService } from '../../shared/services/user-trip.service';
import { MapService } from '../../shared/services/map.service';
import { LanguageService } from '../../shared/services/language.service';

import { StationBoardData, StationBoardService } from '../station-board.service';
import { StationBoardInputComponent } from '../input/station-board-input.component';
import { DebugXmlPopoverComponent } from '../../search-form/debug-xml-popover/debug-xml-popover.component';
import { CustomStopEventXMLPopoverComponent } from './custom-stop-event-xml-popover/custom-stop-event-xml-popover.component';
import { EmbedStationBoardPopoverComponent } from './embed-station-board-popover/embed-station-board-popover.component';

import { APP_STAGE, APP_STAGEs, DEBUG_LEVEL, DEFAULT_APP_STAGE } from '../../config/constants'

type URLType = 'prodv1' | 'betav1' | 'betav2' | 'beta';

@Component({
  selector: 'station-board-search',
  templateUrl: './station-board-search.component.html',
  styleUrls: ['./station-board-search.component.scss']
})
export class StationBoardSearchComponent implements OnInit {
  @ViewChild(SbbExpansionPanel, { static: true }) searchPanel: SbbExpansionPanel | undefined;
  @ViewChild(StationBoardInputComponent) autocompleteInputComponent: StationBoardInputComponent | undefined;

  public stationBoardType: OJP_Legacy.StationBoardType;

  public searchLocation: OJP_Legacy.Location | null
  
  public searchTime: string
  
  public appStageOptions: APP_STAGE[];
  public stationBoardTypes: OJP_Legacy.StationBoardType[]
  public isSearching: boolean

  private queryParams: URLSearchParams

  public permalinkRelativeURL: string;
  public mapURLs: Record<URLType, string>;

  public currentRequestInfo: OJP_Legacy.RequestInfo | null;

  public headerText: string = 'Search'

  private useMocks = false;
  public isEmbed: boolean;
  public showURLS: boolean;

  public isV1: boolean;
  public useRealTimeDataTypes: OJP_Legacy.UseRealtimeDataEnumeration[];

  get searchDate() {
    return this.stationBoardService.searchDate;
  }
  set searchDate(newDate: Date) {
    this.stationBoardService.searchDate = newDate;
  }

  constructor(
    private notificationToast: SbbNotificationToast,
    private debugXmlPopover: SbbDialog,
    private customXmlPopover: SbbDialog,
    private mapService: MapService, 
    public stationBoardService: StationBoardService,
    private languageService: LanguageService,
    public userTripService: UserTripService,
    private embedHTMLPopover: SbbDialog,
    private router: Router,
  ) {
    this.queryParams = new URLSearchParams(document.location.search);

    this.appStageOptions = APP_STAGEs;

    this.stationBoardTypes = ['Departures', 'Arrivals']

    this.stationBoardType = this.computeStationBoardType();

    this.searchLocation = null;

    this.stationBoardService.searchDate = this.computeSearchDateTime();
    this.searchTime = OJP_Legacy.DateHelpers.formatTimeHHMM(this.stationBoardService.searchDate);
    
    this.isSearching = false

    this.permalinkRelativeURL = '';
    this.mapURLs = <Record<URLType, string>>{};
    this.updateURLs();

    this.currentRequestInfo = null;

    const queryParams = new URLSearchParams(document.location.search);
    this.useMocks = queryParams.get('use_mocks') === 'yes';

    this.isEmbed = this.router.url.indexOf('/embed/') !== -1;
    this.headerText = this.stationBoardType;
    this.showURLS = DEBUG_LEVEL === 'DEBUG';

    this.isV1 = OJP_Legacy.OJP_VERSION === '1.0';
    this.useRealTimeDataTypes = ['full', 'explanatory', 'none'];
  }

  ngOnInit(): void {
    const userStage = this.queryParams.get('stage');
    if (userStage) {
      const newAppStage = this.computeAppStageFromString(userStage);
      if (newAppStage) {
        setTimeout(() => {
          // HACK 
          // without the setTimeout , the parent src/app/station-board/station-board.component.html template 
          // gives following errors core.mjs:9157 ERROR RuntimeError: NG0100: ExpressionChangedAfterItHasBeenCheckedError: 
          // Expression has changed after it was checked. Previous value: 'PROD'. Current value: 'INT'. 
          // Find more at https://angular.io/errors/NG0100
          this.userTripService.updateAppStage(newAppStage);
        });
      }
    }

    const userStopID = this.queryParams.get('stop_id');
    if (userStopID) {
      this.updateCurrentRequestData(userStopID);

      this.fetchStopEventsForStopRef(userStopID);
      this.lookupStopPlaceRef(userStopID);
    }

    this.stationBoardService.stationOnMapClicked.subscribe(feature => {
      this.handleMapClick(feature);
    })

    this.customInitFromParams();
  }

  private customInitFromParams() {
    if (this.useMocks) {
      if (this.useMocks && document.location.hostname === 'localhost') {
        this.fetchStopEventFromMocks();
        return;
      }
    }

    const gistId = this.queryParams.get('gist');
    if (gistId) {
      this.initFromGistRef(gistId);
      return;
    }
  }

  private async initFromGistRef(gistId: string) {
    const mockText = await OJPHelpers.fetchGist(gistId);
    if (mockText === null) {
      console.error('initFromGistRef: cant fetch gist XML');
      return;
    }

    this.initFromMockXML(mockText);
  }

  private computeAppStageFromString(appStageS: string): APP_STAGE | null {
    const availableStagesLower: string[] = this.appStageOptions.map(stage => {
      return stage.toLowerCase();
    });

    const appStage = appStageS.trim() as APP_STAGE;
    const stageIDX = availableStagesLower.indexOf(appStage.toLowerCase());
    if (stageIDX !== -1) {
      return this.appStageOptions[stageIDX];
    }

    return null;
  }

  public onLocationSelected(location: OJP_Legacy.Location) {
    const stopPlaceRef = location.stopPlace?.stopPlaceRef ?? null;
    if (stopPlaceRef) {
      this.updateCurrentRequestData(stopPlaceRef);
    }

    this.searchLocation = location;
    this.mapService.tryToCenterAndZoomToLocation(location)

    this.updateURLs();
    this.updateHeaderText();
    
    this.resetResultList();
  }

  public onDateTimeChanged() {
    const timeParts = this.searchTime.split(':');
    if (timeParts.length === 2) {
      const timeHours = parseInt(timeParts[0], 10);
      const timeMinutes = parseInt(timeParts[1], 10);
      
      this.stationBoardService.searchDate.setHours(timeHours);
      this.stationBoardService.searchDate.setMinutes(timeMinutes);
    }

    this.updateURLs();
  }

  public onTypeChanged() {
    this.updateURLs();
    this.updateHeaderText();
  }

  public isSearchButtonDisabled(): boolean {
    if (this.isSearching) {
      return true;
    }

    if (this.searchLocation === null) {
      return true;
    }

    return false;
  }

  public searchButtonClicked() {
    this.notificationToast.dismiss();

    const stopPlaceRef = this.searchLocation?.stopPlace?.stopPlaceRef ?? null;
    if (stopPlaceRef === null) {
      console.error('ERROR - no stopPlaceRef available');
      return;
    }

    this.fetchStopEventsForStopRef(stopPlaceRef);
  }

  private computeSearchDateTime(): Date {
    let searchDate = new Date()
    
    const userSearchDay = this.queryParams.get('day');
    if (userSearchDay) {
      searchDate = new Date(Date.parse(userSearchDay));
    }

    const userSearchTime = this.queryParams.get('time');
    const nowDate = new Date();
    let timeHours = nowDate.getHours();
    let timeMinutes = nowDate.getMinutes();
    if (userSearchTime) {
      const timeParts = userSearchTime.split(':');
      if (timeParts.length === 2) {
        timeHours = parseInt(timeParts[0], 10);
        timeMinutes = parseInt(timeParts[1], 10);
      }
    }

    searchDate.setHours(timeHours);
    searchDate.setMinutes(timeMinutes);

    return searchDate;
  }

  private computeStationBoardType(): OJP_Legacy.StationBoardType {
    const userSearchTypeStationBoardType = this.queryParams.get('type');
    if (userSearchTypeStationBoardType === 'arr') {
      return 'Arrivals';
    }
    if (userSearchTypeStationBoardType === 'dep') {
      return 'Departures';
    }

    const defaultValue: OJP_Legacy.StationBoardType = 'Departures';
    return defaultValue;
  }

  private updateURLs() {
    const queryParams = new URLSearchParams()
    
    if (this.stationBoardType === 'Arrivals') {
      queryParams.set('type', 'arr');
    }
    
    const stopPlaceRef = this.searchLocation?.stopPlace?.stopPlaceRef ?? null;
    if (stopPlaceRef) {
      queryParams.set('stop_id', stopPlaceRef);
    }

    const searchDate = this.stationBoardService.searchDate;
    const now = new Date();
    const deltaNowMinutes = Math.abs((now.getTime() - searchDate.getTime()) / 1000 / 60);
    if (deltaNowMinutes > 5) {
      const nowDateF = OJP_Legacy.DateHelpers.formatDate(new Date());
      const searchDateF = OJP_Legacy.DateHelpers.formatDate(searchDate);

      const nowDayF = nowDateF.substring(0, 10);
      const searchDayF = searchDateF.substring(0, 10);
      if (searchDayF !== nowDayF) {
        queryParams.set('day', searchDayF);
      }

      const nowTimeF = nowDateF.substring(11, 16);
      const searchTimeF = searchDateF.substring(11, 16);
      if (nowTimeF !== searchTimeF) {
        queryParams.set('time', searchTimeF);
      }
    }

    if (this.userTripService.currentAppStage !== DEFAULT_APP_STAGE) {
      const stageS = this.userTripService.currentAppStage.toLowerCase();
      queryParams.append('stage', stageS)
    }

    this.permalinkRelativeURL = document.location.pathname.replace('/embed', '') + '?' + queryParams.toString();
    this.updateLinkedURLs(queryParams);
  }

  private updateLinkedURLs(queryParams: URLSearchParams) {
    this.mapURLs.prodv1 = 'https://opentdatach.github.io/ojp-demo-app/board?' + queryParams.toString();
    this.mapURLs.betav1 = 'https://tools.odpch.ch/beta-ojp-demo/board?' + queryParams.toString();
    this.mapURLs.betav2 = 'https://tools.odpch.ch/ojp-demo-v2/board?' + queryParams.toString();
    
    const isOJPv2 = OJP_Legacy.OJP_VERSION === '2.0';
    this.mapURLs.beta = isOJPv2 ? this.mapURLs.betav1 : this.mapURLs.betav2;
    this.userTripService.betaURLText = isOJPv2 ? 'BETA-v1' : 'BETA-v2';
  }

  private fetchStopEventsForStopRef(stopPlaceRef: string) {
    const stopEventRequest = this.computeStopEventRequest(stopPlaceRef);
    stopEventRequest.enableExtensions = this.userTripService.currentAppStage !== 'OJP-SI';

    stopEventRequest.fetchResponse().then(response => {
      this.currentRequestInfo = stopEventRequest.requestInfo;
      this.parseStopEvents(response.stopEvents);
    });
  }

  private async fetchStopEventFromMocks() {
    const mockURL = '/path/to/mock.xml';

    const mockText = await (await fetch(mockURL)).text();
    this.initFromMockXML(mockText);
  }

  private initFromMockXML(mockText: string) {
    const request = OJP_Legacy.StopEventRequest.initWithMock(mockText);
    request.fetchResponse().then(response => {
      if (response.stopEvents.length > 0) {
        const stopEvent = response.stopEvents[0];
        const firstLocation = stopEvent.stopPoint.location;
        if (firstLocation) {
          this.onLocationSelected(firstLocation);
        }
      }

      this.parseStopEvents(response.stopEvents);
    });
  }

  private computeStopEventRequest(stopPlaceRef: string): OJP_Legacy.StopEventRequest {
    const stopEventType: OJP_Legacy.StopEventType = this.stationBoardType === 'Arrivals' ? 'arrival' : 'departure'
    const stopEventDate = this.computeStopBoardDate();
    const appStageConfig = this.userTripService.getStageConfig();
    const stopEventRequest = OJP_Legacy.StopEventRequest.initWithStopPlaceRef(appStageConfig, this.languageService.language, stopPlaceRef, stopEventType, stopEventDate);
    stopEventRequest.useRealTimeDataType = this.userTripService.useRealTimeDataType;
    
    // for debug XML dialog
    stopEventRequest.updateRequestXML();

    return stopEventRequest;
  }

  private parseStopEvents(stopEvents: OJP_Legacy.StopEvent[]): void {
    const hasResults = stopEvents.length > 0;
    if (hasResults) {
      this.searchPanel?.close();

      this.updateHeaderText();
    }

    const stationBoardData: StationBoardData = {
      type: this.stationBoardType,
      items: stopEvents,
    }
    this.stationBoardService.stationBoardDataUpdated.emit(stationBoardData);
  }

  private async lookupStopPlaceRef(stopPlaceRef: string) {
    const stageConfig = this.userTripService.getStageConfig();
    const locationInformationRequest = OJP_Legacy.LocationInformationRequest.initWithStopPlaceRef(stageConfig, this.languageService.language, stopPlaceRef);
    locationInformationRequest.enableExtensions = this.userTripService.currentAppStage !== 'OJP-SI';

    const response = await locationInformationRequest.fetchResponse();

    if (response.locations.length === 0) {
      console.error('ERROR - cant find stopPlaceRef with ID: ' + stopPlaceRef);
      return;
    }

    const firstLocation = response.locations[0];
    this.searchLocation = firstLocation;

    this.mapService.tryToCenterAndZoomToLocation(firstLocation);
    this.updateURLs();
    this.updateHeaderText();

    if (this.autocompleteInputComponent) {
      this.autocompleteInputComponent.updateLocationText(firstLocation);
    }
  }

  private updateHeaderText() {
    if (this.searchLocation === null) {
      return;
    }

    const locationName = this.searchLocation.computeLocationName();
    if (locationName === null) {
      return;
    }

    this.headerText = this.stationBoardType + ' ' + locationName;
  }

  private handleMapClick(feature: GeoJSON.Feature) {
    const location = OJP_Legacy.Location.initWithFeature(feature);
    if (location === null) {
      return;
    }

    this.searchLocation = location;
    if (this.autocompleteInputComponent) {
      this.autocompleteInputComponent.updateLocationText(location);
    }

    this.resetResultList();
    this.updateURLs();

    this.searchPanel?.open();
  }

  private resetResultList() {
    const stationBoardData: StationBoardData = {
      type: this.stationBoardType,
      items: [],
    }
    this.stationBoardService.stationBoardDataUpdated.emit(stationBoardData);
  }

  private computeStopBoardDate(): Date {
    const departureDate = this.stationBoardService.searchDate;
    
    const timeParts = this.searchTime.split(':');
    if (timeParts.length === 2) {
      const timeHours = parseInt(timeParts[0]);
      const timeMinutes = parseInt(timeParts[1]);

      departureDate.setHours(timeHours);
      departureDate.setMinutes(timeMinutes);
    }

    return departureDate
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

  onChangeStageAPI(ev: any) {
    const newAppStage = ev.value as APP_STAGE
    this.userTripService.updateAppStage(newAppStage)
  }

  public loadCustomXMLPopover() {
    const dialogRef = this.customXmlPopover.open(CustomStopEventXMLPopoverComponent, {
      position: { top: '20px' },
    });
    dialogRef.afterOpened().subscribe(() => {
      this.notificationToast.dismiss();

      const popover = dialogRef.componentInstance as CustomStopEventXMLPopoverComponent;

      if (this.currentRequestInfo === null) {
        const stopPlaceRefZH = '8503000';
        const stopEventRequest = this.computeStopEventRequest(stopPlaceRefZH);
        this.currentRequestInfo = stopEventRequest.requestInfo;
      }

      popover.customRequestXMLs = this.currentRequestInfo?.requestXML ?? 'n/a';

      popover.customRequestSaved.subscribe((responseXML) => {
        dialogRef.close()
        this.handleCustomResponse(responseXML);
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

    const request = OJP_Legacy.StopEventRequest.initWithMock(responseXML);
    request.fetchResponse().then(response => {
      const stopEvents = response.stopEvents;

      if (stopEvents.length > 0) {
        this.mapService.tryToCenterAndZoomToLocation(stopEvents[0].stopPoint.location);
        this.parseStopEvents(response.stopEvents);
      } else {
        this.notificationToast.open('No StopEvents found', {
          type: 'error',
          verticalPosition: 'top',
        });
      }
    });
  }

  private updateCurrentRequestData(stopRef: string): void {
    const request = this.computeStopEventRequest(stopRef);
    this.currentRequestInfo = request.requestInfo;
  }

  public loadEmbedHTMLPopover() {
    const dialogRef = this.embedHTMLPopover.open(EmbedStationBoardPopoverComponent, {
      position: { top: '20px' },
    });

    dialogRef.afterOpened().subscribe(() => {
      const popover = dialogRef.componentInstance as EmbedStationBoardPopoverComponent;
      if (this.searchLocation) {
        popover.updateEmbedHTML(this.searchLocation);
      }
    })
  }

  public resetDateTime() {
    const nowDateTime = new Date();
    this.searchDate = nowDateTime;
    this.searchTime = OJP_Legacy.DateHelpers.formatTimeHHMM(nowDateTime);
    this.stationBoardService.searchDate = nowDateTime;
  }
}
