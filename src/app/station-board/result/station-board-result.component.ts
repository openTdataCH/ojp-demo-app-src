import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { SbbDialog } from '@sbb-esta/angular/dialog';

import * as OJP from 'ojp-sdk';

import { StationBoardService } from '../station-board.service';

import { TripInfoResultPopoverComponent } from '../../journey/journey-result-row/result-trip-leg/trip-info-result-popover/trip-info-result-popover.component';
import { StationBoardType } from '../types/stop-event';
import { StopEventResult } from '../../shared/models/stop-event-result';
import { StopEventType } from '../../shared/types/_all';
import { SituationContent } from '../../shared/models/situation';
import { StopPointCall, StopPointHelpers } from '../../shared/models/stop-point-call';

interface StationBoardTime {
  stopTime: string
  stopTimeActual: string | null
  stopDelayText: string | null
  
  hasDelay: boolean
  hasDelayDifferentTime: boolean
}

interface StationBoardModel {
  stopEvent: StopEventResult

  serviceLineNumber: string
  servicePtMode: string
  serviceInfo: string
  journeyRef: string

  tripNumber: string | null
  tripHeading: string
  tripOperator: string

  mapStationBoardTime: Record<StationBoardType, StationBoardTime>
  
  stopPlatform: string | null
  stopPlatformActual: string | null

  situations: SituationContent[]

  isCancelled: boolean
  hasDeviation: boolean
  isUnplanned: boolean
}

@Component({
  selector: 'station-board-result',
  styleUrls: ['./station-board-result.component.scss'],
  templateUrl: './station-board-result.component.html',
})
export class StationBoardResultComponent implements OnInit, AfterViewInit {
  @ViewChild('stationBoardWrapper') stationBoardWrapperRef: ElementRef | undefined;
  public stopEventsData: StationBoardModel[];
  public selectedIDx: number | null;
  public stationBoardType: StationBoardType;

  constructor(private stationBoardService: StationBoardService, private tripInfoResultPopover: SbbDialog, private sanitizer: DomSanitizer) {
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

  private computeStopTime(stopTime: Date | null): string | null {
    if (stopTime === null) {
      return null
    }

    const stopTimeText = OJP.DateHelpers.formatTimeHHMM(stopTime);
    
    return stopTimeText;
  }

  private computeDelayTime(stopPoint: StopPointCall, forBoardType: StationBoardType): string | null {
    const isArrival = forBoardType === 'Arrivals';

    const stopEventType: StopEventType = isArrival ? 'arrival' : 'departure';
    const delayMinutes = StopPointHelpers.computeDelayMinutes(stopEventType, stopPoint);
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

  private computeStopTimeData(stopPoint: StopPointCall, forBoardType: StationBoardType): StationBoardTime | null {
    const isArrival = forBoardType === 'Arrivals';
    const stopPointTime = isArrival ? stopPoint.arrival : stopPoint.departure;

    if (stopPointTime === null) {
      return null;
    }

    if (stopPointTime.timetable === null) {
      return null;
    }

    const delayMinutes = this.computeDelayTime(stopPoint, forBoardType);
    const hasDelay = delayMinutes !== null;
    
    const timetableTimeF = OJP.DateHelpers.formatTimeHHMM(stopPointTime.timetable);
    const estimatedTimeF = stopPointTime.realtime ? OJP.DateHelpers.formatTimeHHMM(stopPointTime.realtime) : 'n/a';
    const hasDelayDifferentTime = stopPointTime.realtime ? (timetableTimeF !== estimatedTimeF) : false;

    const stopTime = this.computeStopTime(stopPointTime.timetable);
    if (stopTime === null) {
      return null;
    }

    const stopTimeData: StationBoardTime = {
      stopTime: stopTime,
      stopTimeActual: this.computeStopTime(stopPointTime.realtime ?? null),
      stopDelayText: this.computeDelayTime(stopPoint, forBoardType),

      hasDelay: hasDelay,
      hasDelayDifferentTime: hasDelayDifferentTime,
    }

    return stopTimeData;
  }

  private computeStationBoardModel(stopEvent: StopEventResult): StationBoardModel {
    const servicePtMode = stopEvent.service.mode.ptMode ?? 'N/A';

    const arrivalTime = this.computeStopTimeData(stopEvent.thisCall, 'Arrivals');
    const departureTime = this.computeStopTimeData(stopEvent.thisCall, 'Departures');

    const stopPlatformActual = stopEvent.thisCall.platform.timetable === stopEvent.thisCall.platform.realtime ? null : stopEvent.thisCall.platform.timetable;

    const isCancelled = stopEvent.service.cancelled === true;
    const hasDeviation = stopEvent.service.deviation === true;
    const isUnplanned = stopEvent.service.unplanned === true;

    const service = stopEvent.service;

    const model = <StationBoardModel>{
      stopEvent: stopEvent,
      serviceLineNumber: stopEvent.service.publishedServiceName.text ?? 'n/a',
      servicePtMode: servicePtMode,
      serviceInfo: service.formatServiceName(),
      journeyRef: stopEvent.service.journeyRef,
      
      tripNumber: stopEvent.service.trainNumber, 
      tripHeading: stopEvent.service.destinationText?.text ?? 'n/a', 
      tripOperator: stopEvent.service.operatorRef,
      mapStationBoardTime: {
        Arrivals: arrivalTime,
        Departures: departureTime,
      },
      stopPlatform: stopEvent.thisCall.platform.timetable,
      stopPlatformActual: stopPlatformActual,
      
      situations: stopEvent.situationsContent,

      isCancelled: isCancelled,
      hasDeviation: hasDeviation,
      isUnplanned: isUnplanned,
    }

    return model;
  }

  public loadTripInfoResultPopover(journeyRef: string) {
    const dialogRef = this.tripInfoResultPopover.open(TripInfoResultPopoverComponent, {
      position: { top: '20px' },
      // width: '50vw',
      // height: '90vh',
    });
    dialogRef.afterOpened().subscribe(() => {
      const popover = dialogRef.componentInstance as TripInfoResultPopoverComponent;
      popover.fetchJourneyRef(journeyRef, this.stationBoardService.searchDate);
    });
  }
}
