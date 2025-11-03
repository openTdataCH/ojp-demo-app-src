import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { SbbDialog } from '@sbb-esta/angular/dialog';

import OJP_Legacy from '../../config/ojp-legacy';

import { StationBoardService } from '../station-board.service';
import { OJPHelpers } from '../../helpers/ojp-helpers';

import { TripInfoResultPopoverComponent } from '../../journey/journey-result-row/result-trip-leg/trip-info-result-popover/trip-info-result-popover.component';
import { SituationContent } from '../../shared/types/situations';
import { JourneyService } from '../../shared/models/journey-service';
import { StationBoardType } from '../types/stop-event';

interface StationBoardTime {
  stopTime: string
  stopTimeActual: string | null
  stopDelayText: string | null
  
  hasDelay: boolean
  hasDelayDifferentTime: boolean
}

interface StationBoardModel {
  stopEvent: OJP_Legacy.StopEvent

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
  public stopEventsData: StationBoardModel[]
  public selectedIDx: number | null
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

  private computeServiceLineNumber(stopEvent: OJP_Legacy.StopEvent): string {
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

    const stopTimeText = OJP_Legacy.DateHelpers.formatTimeHHMM(stopTime);
    
    return stopTimeText;
  }

  private computeDelayTime(stopPoint: OJP_Legacy.StopPoint, forBoardType: StationBoardType): string | null {
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

  private computeStopTimeData(stopPoint: OJP_Legacy.StopPoint, forBoardType: StationBoardType): StationBoardTime | null {
    const isArrival = forBoardType === 'Arrivals';
    const stopPointTime = isArrival ? stopPoint.arrivalData : stopPoint.departureData;

    if (stopPointTime === null) {
        return null
    }

    const hasDelay = stopPointTime.delayMinutes !== null;
    
    const timetableTimeF = OJP_Legacy.DateHelpers.formatTimeHHMM(stopPointTime.timetableTime);
    const estimatedTimeF = stopPointTime.estimatedTime ? OJP_Legacy.DateHelpers.formatTimeHHMM(stopPointTime.estimatedTime) : 'n/a';
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

  private computeStationBoardModel(stopEvent: OJP_Legacy.StopEvent): StationBoardModel {
    const serviceLineNumber = this.computeServiceLineNumber(stopEvent);
    const servicePtMode = stopEvent.journeyService.ptMode.shortName ?? 'N/A';

    const arrivalTime = this.computeStopTimeData(stopEvent.stopPoint, 'Arrivals');
    const departureTime = this.computeStopTimeData(stopEvent.stopPoint, 'Departures');

    const stopPlatformActual = stopEvent.stopPoint.plannedPlatform === stopEvent.stopPoint.actualPlatform ? null : stopEvent.stopPoint.actualPlatform;

    const isCancelled = stopEvent.journeyService.hasCancellation === true;
    const hasDeviation = stopEvent.journeyService.hasDeviation === true;
    const isUnplanned = stopEvent.journeyService.isUnplanned === true;

    const service = JourneyService.initWithOJP_LegacyJourneyService(stopEvent.journeyService);

    const model = <StationBoardModel>{
        stopEvent: stopEvent,
        serviceLineNumber: serviceLineNumber,
        servicePtMode: servicePtMode,
        serviceInfo: service.formatServiceName(),
        journeyRef: stopEvent.journeyService.journeyRef,
        
        tripNumber: stopEvent.journeyService.journeyNumber, 
        tripHeading: stopEvent.journeyService.destinationStopPlace?.stopPlaceName ?? 'N/A', 
        tripOperator: stopEvent.journeyService.operatorRef,
        mapStationBoardTime: {
            Arrivals: arrivalTime,
            Departures: departureTime
        },
        stopPlatform: stopEvent.stopPoint.plannedPlatform, 
        stopPlatformActual: stopPlatformActual,
        
        situations: OJPHelpers.computeSituationsData(this.sanitizer, stopEvent.stopPoint.siriSituations),

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
