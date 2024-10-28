import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';

import * as OJP from 'ojp-sdk'

import { StationBoardService } from '../station-board.service';
import { OJPHelpers } from '../../helpers/ojp-helpers';

interface StationBoardTime {
  stopTime: string
  stopTimeActual: string | null
  stopDelayText: string | null
  
  hasDelay: boolean
  hasDelayDifferentTime: boolean
}

interface StationBoardModel {
  stopEvent: OJP.StopEvent

  serviceLineNumber: string
  servicePtMode: string
  tripNumber: string | null
  tripHeading: string
  tripOperator: string

  mapStationBoardTime: Record<OJP.StationBoardType, StationBoardTime>
  
  stopPlatform: string | null
  stopPlatformActual: string | null

  situations: OJP.SituationContent[]

  isCancelled: boolean
}

@Component({
  selector: 'station-board-result',
  styleUrls: ['./station-board-result.component.scss'],
  templateUrl: './station-board-result.component.html',
})
export class StationBoardResultComponent implements OnInit, AfterViewInit {
  @ViewChild('stationBoardWrapper') stationBoardWrapperRef: ElementRef | undefined;
  public stopEventsData: StationBoardModel[]
  public selectedIDx: number | null
  public stationBoardType: OJP.StationBoardType

  constructor(private stationBoardService: StationBoardService) {
    this.stopEventsData = [];
    this.selectedIDx = null;
    this.stationBoardType = 'Departures';
  }

  ngOnInit(): void {
    this.stationBoardService.stationBoardDataUpdated.subscribe(stationBoardData => {
      this.stationBoardType = stationBoardData.type

      const stopEvents = stationBoardData.items;
      this.stopEventsData = [];
      stopEvents.forEach(stopEvent => {
        const stationBoardModel = this.computeStationBoardModel(stopEvent);
        this.stopEventsData.push(stationBoardModel);
      })

      if (stopEvents.length > 0) {
        this.selectDataRowAtIndex(0);
      } else {
        this.stationBoardService.stationBoardEntrySelected.emit(null);
      }
    })
  }

  ngAfterViewInit(): void {
    (this.stationBoardWrapperRef?.nativeElement as HTMLDivElement).addEventListener('click', ev => {
      const itemEl = ev.target as HTMLElement;
      if (itemEl === null) { return; }
      const newIDxS = itemEl.closest('.card-item')?.getAttribute('data-index') ?? null;
      if (newIDxS === null) {
        return;
      }

      const newIDx = parseInt(newIDxS, 10);
      if (this.selectedIDx === newIDx) {
        return;
      }

      this.selectDataRowAtIndex(newIDx);
    })
  }

  private selectDataRowAtIndex(idx: number) {
    this.selectedIDx = idx;

    const stationBoardEntry = this.stopEventsData[idx];
    this.stationBoardService.stationBoardEntrySelected.emit(stationBoardEntry.stopEvent);
  }

  public hasDelay(stopEvent: StationBoardModel): boolean {
    const stationBoardTime = stopEvent.mapStationBoardTime[this.stationBoardType];
    if (!stationBoardTime) {
      return false;
    }

    return stationBoardTime.hasDelay;
  }

  public hasDelayDifferentTime(stopEvent: StationBoardModel): boolean {
    const stationBoardTime = stopEvent.mapStationBoardTime[this.stationBoardType];
    if (!stationBoardTime) {
      return false;
    }

    return stationBoardTime.hasDelayDifferentTime;
  }

  public formatStopEventTime(stopEvent: StationBoardModel, key: 'stopTime' | 'stopTimeActual' | 'stopDelayText'): string | null {
    const stationBoardTime = stopEvent.mapStationBoardTime[this.stationBoardType];
    if (stationBoardTime === null) {
      return null;
    }

    const timeF = stationBoardTime[key];
    return timeF;
  }

  public hasSituations(stopEvent: StationBoardModel): boolean {
    return stopEvent.situations.length > 0;
  }

  private computeServiceLineNumber(stopEvent: OJP.StopEvent): string {
    const serviceShortName = stopEvent.journeyService.ptMode.shortName ?? 'N/A';
    const serviceLineNumber = stopEvent.journeyService.serviceLineNumber;
    if (serviceLineNumber) {
        return serviceLineNumber
    } else {
        return serviceShortName;
    }
  }

  private computeStopTime(stopTime: Date | null): string | null {
    if (stopTime === null) {
      return null
    }

    const stopTimeText = OJP.DateHelpers.formatTimeHHMM(stopTime);
    
    return stopTimeText;
  }

  private computeDelayTime(stopPoint: OJP.StopPoint, forBoardType: OJP.StationBoardType): string | null {
    const isArrival = forBoardType === 'Arrivals';
    const stopPointTime = isArrival ? stopPoint.arrivalData : stopPoint.departureData;

    const delayMinutes = stopPointTime?.delayMinutes ?? null;
    if (delayMinutes === null) {
        return null;
    }

    if (delayMinutes === 0) {
        return 'ON TIME';
    }

    const delayTextParts: string[] = []
    delayTextParts.push(' ')
    delayTextParts.push(delayMinutes > 0 ? '+' : '')
    delayTextParts.push('' + delayMinutes)
    delayTextParts.push("'");

    const delayText = delayTextParts.join('');
    return delayText;
  }

  private computeStopTimeData(stopPoint: OJP.StopPoint, forBoardType: OJP.StationBoardType): StationBoardTime | null {
    const isArrival = forBoardType === 'Arrivals';
    const stopPointTime = isArrival ? stopPoint.arrivalData : stopPoint.departureData;

    if (stopPointTime === null) {
        return null
    }

    const hasDelay = stopPointTime.delayMinutes !== null;
    
    const timetableTimeF = OJP.DateHelpers.formatTimeHHMM(stopPointTime.timetableTime);
    const estimatedTimeF = stopPointTime.estimatedTime ? OJP.DateHelpers.formatTimeHHMM(stopPointTime.estimatedTime) : 'n/a';
    const hasDelayDifferentTime = stopPointTime.estimatedTime ? (timetableTimeF !== estimatedTimeF) : false;

    const stopTime = this.computeStopTime(stopPointTime.timetableTime);
    if (stopTime === null) {
        return null;
    }

    const stopTimeData: StationBoardTime = {
        stopTime: stopTime,
        stopTimeActual: this.computeStopTime(stopPointTime.estimatedTime ?? null),
        stopDelayText: this.computeDelayTime(stopPoint, forBoardType),

        hasDelay: hasDelay,
        hasDelayDifferentTime: hasDelayDifferentTime,
    }

    return stopTimeData;
  }

  private computeStationBoardModel(stopEvent: OJP.StopEvent): StationBoardModel {
    const serviceLineNumber = this.computeServiceLineNumber(stopEvent);
    const servicePtMode = stopEvent.journeyService.ptMode.shortName ?? 'N/A';

    const arrivalTime = this.computeStopTimeData(stopEvent.stopPoint, 'Arrivals');
    const departureTime = this.computeStopTimeData(stopEvent.stopPoint, 'Departures');

    const stopPlatformActual = stopEvent.stopPoint.plannedPlatform === stopEvent.stopPoint.actualPlatform ? null : stopEvent.stopPoint.actualPlatform;

    const isCancelled = stopEvent.journeyService.hasCancellation;

    const model = <StationBoardModel>{
        stopEvent: stopEvent,
        serviceLineNumber: serviceLineNumber,
        servicePtMode: servicePtMode,
        tripNumber: stopEvent.journeyService.journeyNumber, 
        tripHeading: stopEvent.journeyService.destinationStopPlace?.stopPlaceName ?? 'N/A', 
        tripOperator: stopEvent.journeyService.agencyID,
        mapStationBoardTime: {
            Arrivals: arrivalTime,
            Departures: departureTime
        },
        stopPlatform: stopEvent.stopPoint.plannedPlatform, 
        stopPlatformActual: stopPlatformActual,
        
        situations: OJPHelpers.computeSituationsData(stopEvent.stopPoint.siriSituations),

        isCancelled: isCancelled,
    }

    return model;
  }
}
