import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';

import { SbbExpansionPanel } from '@sbb-esta/angular/accordion';
import { SbbDialog } from '@sbb-esta/angular/dialog';
import { SbbNotificationToast } from '@sbb-esta/angular/notification-toast';

import * as GeoJSON from 'geojson';

import * as OJP_Types from 'ojp-shared-types';
import * as OJP from 'ojp-sdk';

import { APP_STAGE, APP_STAGEs, DEFAULT_APP_STAGE, OJP_VERSION, REQUESTOR_REF } from '../../config/constants';

import { OJPHelpers } from '../../helpers/ojp-helpers';

import { UserTripService } from '../../shared/services/user-trip.service';
import { MapService } from '../../shared/services/map.service';
import { LanguageService } from '../../shared/services/language.service';

import { StationBoardData, StationBoardService } from '../station-board.service';
import { DebugXmlPopoverComponent } from '../../search-form/debug-xml-popover/debug-xml-popover.component';
import { CustomStopEventXMLPopoverComponent } from './custom-stop-event-xml-popover/custom-stop-event-xml-popover.component';
import { EmbedStationBoardPopoverComponent } from './embed-station-board-popover/embed-station-board-popover.component';
import { StationBoardType } from '../types/stop-event';
import { StopPlace } from '../../shared/models/place/stop-place';
import { StopEventResult } from '../../shared/models/stop-event-result';
import { AnyStopEventRequestResponse } from '../../shared/types/_all';
import { JourneyService } from '../../shared/models/journey-service';
import { DataHelpers } from '../../helpers/data-helpers';
import { AnyPlace } from 'src/app/shared/models/place/place-builder';

@Component({
  selector: 'station-board-search',
  templateUrl: './station-board-search.component.html',
  styleUrls: ['./station-board-search.component.scss']
})
export class StationBoardSearchComponent implements OnInit {
  @ViewChild(SbbExpansionPanel, { static: true }) searchPanel: SbbExpansionPanel | undefined;

  public currentAppStage: APP_STAGE;

  public stationBoardType: StationBoardType;

  public stopPlace: StopPlace | null;
  
  public searchTime: string;
  
  public appStageOptions: APP_STAGE[];
  public stationBoardTypes: StationBoardType[];
  public isSearching: boolean;

  private queryParams: URLSearchParams;

  public permalinkRelativeURL: string;
  public otherVersionURL: string | null;

  public currentRequestInfo: OJP.RequestInfo | null;

  public headerText: string = 'Search';

  private useMocks = false;
  public isEmbed: boolean;

  public isV1: boolean;
  public useRealTimeDataTypes: OJP_Types.UseRealtimeDataEnum[];

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
    private sanitizer: DomSanitizer,
  ) {
    this.currentAppStage = DEFAULT_APP_STAGE;

    this.queryParams = new URLSearchParams(document.location.search);

    this.appStageOptions = APP_STAGEs;

    this.stationBoardTypes = ['Departures', 'Arrivals']

    this.stationBoardType = this.computeStationBoardType();

    this.stopPlace = null;

    this.stationBoardService.searchDate = this.computeSearchDateTime();
    this.searchTime = OJP.DateHelpers.formatTimeHHMM(this.stationBoardService.searchDate);
    
    this.isSearching = false

    this.permalinkRelativeURL = '';
    this.otherVersionURL = null;
    this.updateURLs();

    this.currentRequestInfo = null;

    const queryParams = new URLSearchParams(document.location.search);
    this.useMocks = queryParams.get('use_mocks') === 'yes';

    this.isEmbed = this.router.url.indexOf('/embed/') !== -1;
    this.headerText = this.stationBoardType;

    this.isV1 = OJP_VERSION === '1.0';
    this.useRealTimeDataTypes = ['full', 'explanatory', 'none'];
  }

  async ngOnInit(): Promise<void> {
    const appStage = OJPHelpers.computeAppStage();

    setTimeout(() => {
      // HACK 
      // without the setTimeout , the parent src/app/station-board/station-board.component.html template 
      // gives following errors core.mjs:9157 ERROR RuntimeError: NG0100: ExpressionChangedAfterItHasBeenCheckedError: 
      // Expression has changed after it was checked. Previous value: 'PROD'. Current value: 'INT'. 
      // Find more at https://angular.io/errors/NG0100
      this.userTripService.currentAppStage = appStage;
    });

    this.currentAppStage = appStage;
    this.userTripService.updateAppStage(appStage);

    const userStopID = this.queryParams.get('stop_id');
    if (userStopID) {
      this.updateCurrentRequestData(userStopID);

      await this.fetchStopEventsForStopRef(userStopID);
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

    await this.initFromMockXML(mockText);
  }

  public onStopPlaceSelected(place: AnyPlace) {
    if (place.type !== 'stop') {
      return;
    }

    const stopPlace = place as StopPlace;

    this.updateCurrentRequestData(stopPlace.placeRef.ref);

    this.stopPlace = stopPlace;

    this.mapService.tryToCenterAndZoomToPlace(stopPlace);

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

    if (this.stopPlace === null) {
      return true;
    }

    return false;
  }

  public async searchButtonClicked() {
    this.notificationToast.dismiss();

    const stopPlaceRef = this.stopPlace?.placeRef.ref ?? null;
    if (stopPlaceRef === null) {
      console.error('ERROR - no stopPlaceRef available');
      return;
    }

    await this.fetchStopEventsForStopRef(stopPlaceRef);
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

  private computeStationBoardType(): StationBoardType {
    const userSearchTypeStationBoardType = this.queryParams.get('type');
    if (userSearchTypeStationBoardType === 'arr') {
      return 'Arrivals';
    }
    if (userSearchTypeStationBoardType === 'dep') {
      return 'Departures';
    }

    const defaultValue: StationBoardType = 'Departures';
    return defaultValue;
  }

  private updateURLs() {
    const queryParams = new URLSearchParams();
    
    if (this.stationBoardType === 'Arrivals') {
      queryParams.set('type', 'arr');
    }
    
    const stopPlaceRef = this.stopPlace?.placeRef.ref ?? null;
    if (stopPlaceRef) {
      queryParams.set('stop_id', stopPlaceRef);
    }

    const searchDate = this.stationBoardService.searchDate;
    const now = new Date();
    const deltaNowMinutes = Math.abs((now.getTime() - searchDate.getTime()) / 1000 / 60);
    if (deltaNowMinutes > 5) {
      const nowDate = new Date();
      const nowDateF = OJP.DateHelpers.formatDate(nowDate);
      const searchDateF = OJP.DateHelpers.formatDate(searchDate);

      const nowDayF = nowDateF.substring(0, 10);
      const searchDayF = searchDateF.substring(0, 10);
      if (searchDayF !== nowDayF) {
        queryParams.set('day', searchDayF);
      }

      const nowTimeF = OJP.DateHelpers.formatTimeHHMM(nowDate);
      const searchTimeF = OJP.DateHelpers.formatTimeHHMM(searchDate);
      if (nowTimeF !== searchTimeF) {
        queryParams.set('time', searchTimeF);
      }
    }

    if (this.currentAppStage !== DEFAULT_APP_STAGE) {
      const stageS = this.currentAppStage.toLowerCase();
      queryParams.append('stage', stageS);
    }

    this.permalinkRelativeURL = document.location.pathname.replace('/embed', '') + '?' + queryParams.toString();
    this.updateLinkedURLs(queryParams);
  }

  private updateLinkedURLs(queryParams: URLSearchParams) {
    const isOJPv2 = OJP_VERSION === '2.0';

    const otherVersionQueryParams = new URLSearchParams(queryParams);
    this.userTripService.updateStageLinkedURL(otherVersionQueryParams, isOJPv2);
    if (isOJPv2) {
      // v1
      this.otherVersionURL = 'https://tools.odpch.ch/beta-ojp-demo/board?' + otherVersionQueryParams.toString();
      this.userTripService.otherVersionURLText = 'BETA (OJP 1.0)';
    } else {
      // v2
      this.otherVersionURL = 'https://opentdatach.github.io/ojp-demo-app/board?' + otherVersionQueryParams.toString();
      this.userTripService.otherVersionURLText = 'PROD (OJP 2.0)';
    }
  }

  private async fetchStopEventsForStopRef(stopPlaceRef: string) {
    const sdk = this.userTripService.createOJP_SDK_Instance(this.languageService.language);
    
    const stopEventRequest = this.computeStopEventRequest(stopPlaceRef);

    const response = await stopEventRequest.fetchResponse(sdk);
    this.currentRequestInfo = stopEventRequest.requestInfo;
    
    const stopEventResults = this.parseStopEventRequestResponse(response);
    this.parseStopEvents(stopEventResults);
  }

  private async fetchStopEventFromMocks() {
    const mockURL = '/path/to/mock.xml';

    const mockText = await (await fetch(mockURL)).text();
    await this.initFromMockXML(mockText);
  }

  private async initFromMockXML(mockText: string) {
    const sdk = this.userTripService.createOJP_SDK_Instance(this.languageService.language);

    const request = sdk.requests.StopEventRequest.initWithResponseMock(mockText);
    const response = await request.fetchResponse(sdk);

    if (!response.ok) {
      console.log('ERROR - while fetching SER response');
      console.log(request);
      this.parseStopEvents([]);
      return;
    }

    const stopEventResults = this.parseStopEventRequestResponse(response);

    if (stopEventResults.length > 0) {
      const place = stopEventResults[0].thisCall.place ?? null;
      if (place?.type === 'stop') {
        this.onStopPlaceSelected(place as StopPlace);
      }
    }

    this.parseStopEvents(stopEventResults);
  }

  private parseStopEventRequestResponse(response: AnyStopEventRequestResponse): StopEventResult[] {
    if (!response.ok) {
      return [];
    }

    const isOJPv2 = OJP_VERSION === '2.0';

    const mapPlaces = OJPHelpers.parseAnyPlaceContext(OJP_VERSION, response.value.stopEventResponseContext);
    const mapSituations = OJPHelpers.parseAnySituationsContext(this.sanitizer, OJP_VERSION, response.value.stopEventResponseContext);

    const stopEventResultsSchema: OJP_Types.StopEventResultSchema[] = (() => {
      if (isOJPv2) {
        return response.value.stopEventResult as OJP_Types.StopEventResultSchema[];
      } else {
        const stopEventResultsOJPv1 = response.value.stopEventResult as OJP_Types.OJPv1_StopEventResultSchema[];

        const stopEventResultsOJPv2: OJP_Types.StopEventResultSchema[] = [];
        stopEventResultsOJPv1.forEach(stopEventResultOJPv1 => {
          const serviceOJPv2 = JourneyService.initWithLegacyStopEventResultSchema(stopEventResultOJPv1);

          const stopEventResult: OJP_Types.StopEventResultSchema = {
            id: stopEventResultOJPv1.id,
            stopEvent: {
              previousCall: stopEventResultOJPv1.stopEvent.previousCall,
              thisCall: stopEventResultOJPv1.stopEvent.thisCall,
              onwardCall: stopEventResultOJPv1.stopEvent.onwardCall,
              service: serviceOJPv2,
              operatingDays: stopEventResultOJPv1.stopEvent.operatingDays,
            },
          };

          stopEventResultsOJPv2.push(stopEventResult);
        });

        return stopEventResultsOJPv2;
      }
    })();

    const stopEventResults: StopEventResult[] = [];
    stopEventResultsSchema.forEach(stopEventResultSchema => {
      const stopEventResult = StopEventResult.initWithStopEventResultSchema(stopEventResultSchema, mapPlaces, mapSituations);
      if (stopEventResult) {
        stopEventResults.push(stopEventResult);
      }
    });

    return stopEventResults;
  }

  private computeStopEventRequest(stopPlaceRef: string) {
    const sdk = this.userTripService.createOJP_SDK_Instance(this.languageService.language);

    stopPlaceRef = DataHelpers.convertStopPointToStopPlace(stopPlaceRef);

    const stopEventDate = this.computeStopBoardDate();
    const request = sdk.requests.StopEventRequest.initWithPlaceRefAndDate(stopPlaceRef, stopEventDate);
    if (request.payload.params) {
      request.payload.params.useRealtimeData = this.userTripService.useRealTimeDataType;
      if (this.stationBoardType === 'Arrivals') {
        request.payload.params.stopEventType = 'arrival';
      } else {
        request.payload.params.stopEventType = 'departure';
      }
    }

    return request;
  }

  private parseStopEvents(stopEventResults: StopEventResult[]): void {
    const hasResults = stopEventResults.length > 0;
    if (hasResults) {
      this.searchPanel?.close();

      this.updateHeaderText();
    }

    const stationBoardData: StationBoardData = {
      type: this.stationBoardType,
      items: stopEventResults,
    }
    this.stationBoardService.stationBoardDataUpdated.emit(stationBoardData);
  }

  private async lookupStopPlaceRef(stopPlaceRef: string) {
    stopPlaceRef = DataHelpers.convertStopPointToStopPlace(stopPlaceRef);

    const ojpSDK = this.userTripService.createOJP_SDK_Instance(this.languageService.language);
    const request = ojpSDK.requests.LocationInformationRequest.initWithPlaceRef(stopPlaceRef, 10);

    const response = await request.fetchResponse(ojpSDK);
    if (!response.ok) {
      console.log('ERROR - LIR - initWithPlaceRef');
      console.log(response);
      return;
    }

    const places = OJPHelpers.parseAnyPlaceResult(OJP_VERSION, response);
    if (places.length === 0) {
      console.error('ERROR - cant find stopPlaceRef with ID: ' + stopPlaceRef);
      console.log(response);
      return;
    }

    const stopPlace = StopPlace.initWithPlaceResultSchema(OJP_VERSION, places[0]);
    if (stopPlace === null) {
      console.error('ERROR - cant init StopPlace with ID: ' + stopPlaceRef);
      console.log(response);
      return;
    }

    this.stopPlace = stopPlace;

    this.mapService.tryToCenterAndZoomToPlace(stopPlace);

    this.updateURLs();
    this.updateHeaderText();
  }

  private updateHeaderText() {
    if (this.stopPlace === null) {
      return;
    }

    this.headerText = this.stationBoardType + ' ' + this.stopPlace.placeRef.name;
  }

  private handleMapClick(feature: GeoJSON.Feature) {
    const featureProperties = feature.properties ?? null;
    if (!featureProperties) {
      return;
    }

    if (feature.geometry.type !== 'Point') {
      console.log('ERROR - handleMapClick - invalid geometry expected');
      console.log(feature);
      return;
    }

    const stopPlaceName = featureProperties['stopPlace.stopPlaceName'] ?? null;
    const stopPlaceRef = featureProperties['stopPlace.stopPlaceRef'] ?? null;
    const coords = feature.geometry.coordinates;

    if (stopPlaceName === null || stopPlaceRef === null) {
      console.log('ERROR - handleMapClick - invalid proprerties');
      console.log(feature);
      return;
    }

    const stopPlace = StopPlace.initWithCoordsRefAndName(coords[0], coords[1], stopPlaceName, stopPlaceName, stopPlaceRef);
    this.stopPlace = stopPlace;

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
    const newAppStage = ev.value as APP_STAGE;
    this.userTripService.updateAppStage(newAppStage);
    this.updateURLs();
  }

  public async loadCustomXMLPopover() {
    const dialogRef = this.customXmlPopover.open(CustomStopEventXMLPopoverComponent, {
      position: { top: '20px' },
    });
    dialogRef.afterOpened().subscribe(() => {
      this.notificationToast.dismiss();

      const popover = dialogRef.componentInstance as CustomStopEventXMLPopoverComponent;

      const requestXML: string = (() => {
        if (this.currentRequestInfo?.requestXML) {
          return this.currentRequestInfo.requestXML;
        }

        const stopPlaceRefZH = '8503000';
        const stopEventRequest = this.computeStopEventRequest(stopPlaceRefZH);

        const isOJPv2 = OJP_VERSION === '2.0';
        const xmlConfig = isOJPv2 ? OJP.DefaultXML_Config : OJP.XML_BuilderConfigOJPv1;
        const defaultRequestXML = stopEventRequest.buildRequestXML(this.languageService.language, REQUESTOR_REF, xmlConfig);

        return defaultRequestXML;
      })();

      popover.customRequestXMLs = requestXML;

      popover.customRequestSaved.subscribe(async requestInfo => {
        dialogRef.close();
        this.currentRequestInfo = requestInfo;

        if (requestInfo.responseXML) {
          await this.handleCustomResponse(requestInfo.responseXML);
        }
      });

      popover.customResponseSaved.subscribe(async (responseXML) => {
        dialogRef.close()
        await this.handleCustomResponse(responseXML);
      });
    });
  }

  private async handleCustomResponse(responseXML: string) {
    if (this.currentRequestInfo === null) {
      return;
    }

    this.currentRequestInfo.responseDateTime = new Date();
    this.currentRequestInfo.responseXML = responseXML;

    const sdk = this.userTripService.createOJP_SDK_Instance(this.languageService.language);

    const request = sdk.requests.StopEventRequest.initWithResponseMock(responseXML);
    const response = await request.fetchResponse(sdk);

    if (!response.ok) {
      this.notificationToast.open('No StopEvents found', {
        type: 'error',
        verticalPosition: 'top',
      });
      return;
    }

    const stopEventResults = this.parseStopEventRequestResponse(response);

    if (stopEventResults.length > 0) {
      const place = stopEventResults[0].thisCall.place ?? null;
      if (place?.type === 'stop') {
        this.mapService.tryToCenterAndZoomToPlace(place);
      }
    }

    this.parseStopEvents(stopEventResults);
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
      if (this.stopPlace) {
        popover.updateEmbedHTML(this.stopPlace);
      }
    })
  }

  public resetDateTime() {
    const nowDateTime = new Date();
    this.searchDate = nowDateTime;
    this.searchTime = OJP.DateHelpers.formatTimeHHMM(nowDateTime);
    this.stationBoardService.searchDate = nowDateTime;
  }
}
