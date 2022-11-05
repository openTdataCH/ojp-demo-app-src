import { Component, OnInit, ViewChild } from '@angular/core';
import { SbbExpansionPanel } from '@sbb-esta/angular/accordion';

import * as OJP from '../../shared/ojp-sdk/index'

import { UserTripService } from 'src/app/shared/services/user-trip.service';
import { MapService } from 'src/app/shared/services/map.service';
import { StationBoardData, StationBoardService } from '../station-board.service';
import { StationBoardInputComponent } from '../input/station-board-input.component';

@Component({
  selector: 'station-board-search',
  templateUrl: './station-board-search.component.html',
})
export class StationBoardSearchComponent implements OnInit {
  @ViewChild(SbbExpansionPanel, { static: true }) searchPanel: SbbExpansionPanel | undefined;
  @ViewChild(StationBoardInputComponent) autocompleteInputComponent: StationBoardInputComponent | undefined;

  public appStage: OJP.APP_Stage;
  public stationBoardType: OJP.StationBoardType;

  public searchLocation: OJP.Location | null
  
  public searchDate: Date
  public searchTime: string
  
  public appStageOptions: OJP.APP_Stage[];
  public stationBoardTypes: OJP.StationBoardType[]
  public isSearching: boolean

  private queryParams: URLSearchParams

  constructor(public userTripService: UserTripService, private mapService: MapService, private stationBoardService: StationBoardService) {
    this.queryParams = new URLSearchParams(document.location.search);

    this.appStageOptions = ['PROD', 'TEST', 'TEST LA']
    this.stationBoardTypes = ['Departures', 'Arrivals']

    this.appStage = this.appStageOptions[0];
    
    this.stationBoardType = this.computeStationBoardType();

    this.searchLocation = null;

    this.searchDate = this.computeSearchDateTime();
    this.searchTime = OJP.DateHelpers.formatTimeHHMM(this.searchDate);
    
    this.isSearching = false

  }

  ngOnInit(): void {
    const userStopID = this.queryParams.get('stop_id');
    if (userStopID) {
      this.fetchStopEventsForStopRef(userStopID);
      this.lookupStopPlaceRef(userStopID);
    }

    this.stationBoardService.stationOnMapClicked.subscribe(feature => {
      this.handleMapClick(feature);
    })
  }

  public onLocationSelected(location: OJP.Location) {
    this.searchLocation = location;
    this.mapService.tryToCenterAndZoomToLocation(location)
    
    this.resetResultList();
  }

  public onDateTimeChanged() {

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
    const stopPlaceRef = this.searchLocation?.stopPlace?.stopPlaceRef ?? null;
    if (stopPlaceRef === null) {
      console.error('ERROR - no stopPlaceRef available');
    } else {
      this.fetchStopEventsForStopRef(stopPlaceRef);
    }
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

  private fetchStopEventsForStopRef(stopPlaceRef: string) {
    const stopEventType: OJP.StopEventType = this.stationBoardType === 'Arrivals' ? 'arrival' : 'departure'
    const stopEventDate = this.computeStopBoardDate();
    const appStageConfig = this.userTripService.getStageConfig(this.appStage);
    const stopEventRequest = OJP.StopEventRequest.initWithStopPlaceRef(appStageConfig, stopPlaceRef, stopEventType, stopEventDate);
    stopEventRequest.fetchResponse().then(stopEvents => {
      this.parseStopEvents(stopEvents);
    });
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
    const stageConfig = this.userTripService.getStageConfig(this.appStage);
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

      if (this.autocompleteInputComponent) {
        this.autocompleteInputComponent.updateLocationText(firstLocation);
      }
    });
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
}
