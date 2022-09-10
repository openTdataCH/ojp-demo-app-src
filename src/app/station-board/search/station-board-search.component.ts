import { Component, OnInit, ViewChild } from '@angular/core';
import { SbbExpansionPanel } from '@sbb-esta/angular/accordion';

import * as OJP from '../../shared/ojp-sdk/index'

import { UserTripService } from 'src/app/shared/services/user-trip.service';
import { MapService } from 'src/app/shared/services/map.service';
import { StationBoardService } from '../station-board.service';
import { StationBoardInputComponent } from '../input/station-board-input.component';

type StationBoardType = 'Departures' | 'Arrivals'

@Component({
  selector: 'station-board-search',
  templateUrl: './station-board-search.component.html',
})
export class StationBoardSearchComponent implements OnInit {
  @ViewChild(SbbExpansionPanel, { static: true }) searchPanel: SbbExpansionPanel | undefined;
  @ViewChild(StationBoardInputComponent) autocompleteInputComponent: StationBoardInputComponent | undefined;

  public appStage: OJP.APP_Stage;
  public stationBoardType: StationBoardType;

  public searchLocation: OJP.Location | null
  public searchDate: Date
  public searchTime: string
  
  public appStageOptions: OJP.APP_Stage[];
  public stationBoardTypes: StationBoardType[]
  public isSearching: boolean

  private queryParams: URLSearchParams

  constructor(public userTripService: UserTripService, private mapService: MapService, private stationBoardService: StationBoardService) {
    this.appStageOptions = ['PROD', 'TEST', 'TEST LA']
    this.stationBoardTypes = ['Departures', 'Arrivals']

    this.appStage = this.appStageOptions[0];
    this.stationBoardType = this.stationBoardTypes[0];

    this.searchLocation = null;
    this.searchDate = new Date()
    this.searchTime = OJP.DateHelpers.formatTimeHHMM(this.searchDate);
    
    this.isSearching = false

    this.queryParams = new URLSearchParams(document.location.search)
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
    
    // Reset result list
    this.stationBoardService.stationBoardEntriesUpdated.emit([]);
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

  private fetchStopEventsForStopRef(stopPlaceRef: string) {
    const stopEventType: OJP.StopEventType = this.stationBoardType === 'Arrivals' ? 'arrival' : 'departure'
    const appStageConfig = this.userTripService.getStageConfig(this.appStage);
    const stopEventRequest = OJP.StopEventRequest.initWithStopPlaceRef(appStageConfig, stopPlaceRef, stopEventType);
    stopEventRequest.fetchResponse().then(stopEvents => {
      this.parseStopEvents(stopEvents);
    });
  }

  private parseStopEvents(stopEvents: OJP.StopEvent[]): void {
    if (stopEvents.length > 0) {
      this.searchPanel?.close()
    }

    this.stationBoardService.stationBoardEntriesUpdated.emit(stopEvents);
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

    // Reset result list
    this.stationBoardService.stationBoardEntriesUpdated.emit([]);

    this.searchPanel?.open();
  }
}
