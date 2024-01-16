import * as GeoJSON from 'geojson'

import * as OJP from 'ojp-sdk'

import { Component, OnInit, ViewChild } from '@angular/core';

import { SbbExpansionPanel } from '@sbb-esta/angular/accordion';
import { SbbDialog } from '@sbb-esta/angular/dialog';
import { SbbNotificationToast } from '@sbb-esta/angular/notification-toast';

import { UserTripService } from 'src/app/shared/services/user-trip.service';
import { MapService } from 'src/app/shared/services/map.service';
import { StationBoardData, StationBoardService } from '../station-board.service';
import { StationBoardInputComponent } from '../input/station-board-input.component';
import { DebugXmlPopoverComponent } from '../../search-form/debug-xml-popover/debug-xml-popover.component';
import { CustomStopEventXMLPopoverComponent } from './custom-stop-event-xml-popover/custom-stop-event-xml-popover.component';

import { APP_STAGE } from '../../config/app-config'
import { EmbedStationBoardPopoverComponent } from './embed-station-board-popover/embed-station-board-popover.component';
import { Router } from '@angular/router';

@Component({
  selector: 'station-board-search',
  templateUrl: './station-board-search.component.html',
  styleUrls: ['./station-board-search.component.scss']
})
export class StationBoardSearchComponent implements OnInit {
  @ViewChild(SbbExpansionPanel, { static: true }) searchPanel: SbbExpansionPanel | undefined;
  @ViewChild(StationBoardInputComponent) autocompleteInputComponent: StationBoardInputComponent | undefined;

  public stationBoardType: OJP.StationBoardType;

  public searchLocation: OJP.Location | null
  
  public searchDate: Date
  public searchTime: string
  
  public appStageOptions: APP_STAGE[];
  public stationBoardTypes: OJP.StationBoardType[]
  public isSearching: boolean

  private queryParams: URLSearchParams

  public permalinkURLAddress: string

  public currentRequestData: OJP.RequestData;

  public headerText: string = 'Search'

  private useMocks = false;
  public isEmbed: boolean;

  constructor(
    private notificationToast: SbbNotificationToast,
    private debugXmlPopover: SbbDialog,
    private customXmlPopover: SbbDialog,
    private mapService: MapService, 
    private stationBoardService: StationBoardService,
    public userTripService: UserTripService,
    private embedHTMLPopover: SbbDialog,
    private router: Router,
  ) {
    this.queryParams = new URLSearchParams(document.location.search);

    this.appStageOptions = ['PROD', 'INT', 'TEST', 'LA Beta'];
    this.stationBoardTypes = ['Departures', 'Arrivals']

    this.stationBoardType = this.computeStationBoardType();

    this.searchLocation = null;

    this.searchDate = this.computeSearchDateTime();
    this.searchTime = OJP.DateHelpers.formatTimeHHMM(this.searchDate);
    
    this.isSearching = false

    this.permalinkURLAddress = '';
    this.updatePermalinkURLAddress();

    this.currentRequestData = {
      requestXmlS: null,
      requestDatetime: null,
      responseXmlS: null,
      responseDatetime: null
    };

    const queryParams = new URLSearchParams(document.location.search);
    this.useMocks = queryParams.get('use_mocks') === 'yes';

    this.isEmbed = this.router.url.indexOf('/embed/') !== -1;
    if (this.isEmbed) {
      this.headerText = this.stationBoardType;
    }
  }

  ngOnInit(): void {
    const userStage = this.queryParams.get('stage');
    if (userStage) {
      const newAppStage = this.computeAppStageFromString(userStage);
      if (newAppStage) {
        this.userTripService.updateAppStage(newAppStage)
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

  public onLocationSelected(location: OJP.Location) {
    const stopPlaceRef = location.stopPlace?.stopPlaceRef ?? null;
    if (stopPlaceRef) {
      this.updateCurrentRequestData(stopPlaceRef);
    }

    this.searchLocation = location;
    this.mapService.tryToCenterAndZoomToLocation(location)

    this.updatePermalinkURLAddress();
    this.updateHeaderText();
    
    this.resetResultList();
  }

  public onDateTimeChanged() {
    const timeParts = this.searchTime.split(':');
    if (timeParts.length === 2) {
      const timeHours = parseInt(timeParts[0], 10);
      const timeMinutes = parseInt(timeParts[1], 10);
      
      this.searchDate.setHours(timeHours);
      this.searchDate.setMinutes(timeMinutes);
    }

    this.updatePermalinkURLAddress();
  }

  public onTypeChanged() {
    this.updatePermalinkURLAddress();
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

  private computeStationBoardType(): OJP.StationBoardType {
    const userSearchTypeStationBoardType = this.queryParams.get('type');
    if (userSearchTypeStationBoardType === 'arr') {
      return 'Arrivals';
    }
    if (userSearchTypeStationBoardType === 'dep') {
      return 'Departures';
    }

    const defaultValue: OJP.StationBoardType = 'Departures';
    return defaultValue;
  }

  private updatePermalinkURLAddress() {
    const queryParams = new URLSearchParams()
    if (this.stationBoardType === 'Arrivals') {
      queryParams.set('type', 'arr');
    }
    
    const stopPlaceRef = this.searchLocation?.stopPlace?.stopPlaceRef ?? null;
    if (stopPlaceRef) {
      queryParams.set('stop_id', stopPlaceRef);
    }

    const nowDateF = OJP.DateHelpers.formatDate(new Date());
    const searchDateF = OJP.DateHelpers.formatDate(this.searchDate);

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

    const urlAddress = document.location.pathname.replace('/embed', '') + '?' + queryParams.toString();
    
    this.permalinkURLAddress = urlAddress;
  }

  private fetchStopEventsForStopRef(stopPlaceRef: string) {
    if (this.useMocks && document.location.hostname === 'localhost') {
      this.fetchStopEventFromMocks();
      return;
    }

    const stopEventRequest = this.computeStopEventRequest(stopPlaceRef);

    stopEventRequest.fetchResponse().then(stopEvents => {
      if (stopEventRequest.lastRequestData) {
        this.currentRequestData = stopEventRequest.lastRequestData;
      }
      this.parseStopEvents(stopEvents);
    });
  }

  private fetchStopEventFromMocks() {
    const mockURL = '/path/to/mock.xml';

    const responsePromise = fetch(mockURL);

    console.log('USE MOCKS: ' + mockURL);

    responsePromise.then(response => {
      response.text().then(responseText => {
        const stopEventResponse = new OJP.StopEventResponse();
        stopEventResponse.parseXML(responseText, (message) => {
          if (message === 'StopEvent.DONE') {
            this.parseStopEvents(stopEventResponse.stopEvents);
          } else {
            console.error('TODO: handle error STTAION BOARD');
          }
        });
      });
    });
  }

  private computeStopEventRequest(stopPlaceRef: string): OJP.StopEventRequest {
    const stopEventType: OJP.StopEventType = this.stationBoardType === 'Arrivals' ? 'arrival' : 'departure'
    const stopEventDate = this.computeStopBoardDate();
    const appStageConfig = this.userTripService.getStageConfig();
    const stopEventRequest = OJP.StopEventRequest.initWithStopPlaceRef(appStageConfig, stopPlaceRef, stopEventType, stopEventDate);

    return stopEventRequest;
  }

  private parseStopEvents(stopEvents: OJP.StopEvent[]): void {
    if (stopEvents.length > 0) {
      this.searchPanel?.close()
    }

    const stationBoardData: StationBoardData = {
      type: this.stationBoardType,
      items: stopEvents,
    }
    this.stationBoardService.stationBoardDataUpdated.emit(stationBoardData);
  }

  private lookupStopPlaceRef(stopPlaceRef: string) {
    const stageConfig = this.userTripService.getStageConfig();
    const locationInformationRequest = OJP.LocationInformationRequest.initWithStopPlaceRef(stageConfig, stopPlaceRef)
    const promise = locationInformationRequest.fetchResponse();
    promise.then(locationsData => {
      if (locationsData.length === 0) {
        console.error('ERROR - cant find stopPlaceRef with ID: ' + stopPlaceRef);
        return;
      }

      const firstLocation = locationsData[0];
      this.searchLocation = firstLocation;

      this.mapService.tryToCenterAndZoomToLocation(firstLocation);
      this.updatePermalinkURLAddress();
      this.updateHeaderText();

      if (this.autocompleteInputComponent) {
        this.autocompleteInputComponent.updateLocationText(firstLocation);
      }
    });
  }

  private updateHeaderText() {
    if (!this.isEmbed) {
      return;
    }

    if (this.searchLocation === null) {
      return;
    }

    const locationName = this.searchLocation.computeLocationName();
    if (locationName === null) {
      return;
    }

    this.headerText = locationName + ' ' + this.stationBoardType;
  }

  private handleMapClick(feature: GeoJSON.Feature) {
    const location = OJP.Location.initWithFeature(feature);
    if (location === null) {
      return;
    }

    this.searchLocation = location;
    if (this.autocompleteInputComponent) {
      this.autocompleteInputComponent.updateLocationText(location);
    }

    this.resetResultList();
    this.updatePermalinkURLAddress();

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
    const departureDate = this.searchDate;
    
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
      position: { top: '10px' },
    });
    dialogRef.afterOpened().subscribe(() => {
      const popover = dialogRef.componentInstance as DebugXmlPopoverComponent
      popover.updateRequestData(this.currentRequestData);
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

      const popover = dialogRef.componentInstance as CustomStopEventXMLPopoverComponent

      if (this.currentRequestData.requestXmlS === null) {
        const stopPlaceRefZH = '8503000';
        const stopEventRequest = this.computeStopEventRequest(stopPlaceRefZH);
        this.currentRequestData.requestXmlS = stopEventRequest.computeRequestXmlString();
      }

      popover.customRequestXMLs = this.currentRequestData.requestXmlS;

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
    this.currentRequestData.responseDatetime = new Date();
    this.currentRequestData.responseXmlS = responseXML;

    const stopEventsResponse = new OJP.StopEventResponse();
    stopEventsResponse.parseXML(responseXML, (message) => {
      const stopEvents = stopEventsResponse.stopEvents;

      if (stopEvents.length > 0) {
        this.mapService.tryToCenterAndZoomToLocation(stopEvents[0].stopPoint.location)
      } else {
        this.notificationToast.open('No StopEvents found', {
          type: 'error',
          verticalPosition: 'top',
        });
      }
      
      this.parseStopEvents(stopEvents);
    });
  }

  private updateCurrentRequestData(stopRef: string): void {
    const stopEventRequest = this.computeStopEventRequest(stopRef);

    this.currentRequestData.requestDatetime = new Date();
    this.currentRequestData.requestXmlS = stopEventRequest.computeRequestXmlString();
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
}
