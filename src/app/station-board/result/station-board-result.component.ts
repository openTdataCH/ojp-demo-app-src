import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';

import * as OJP from 'ojp-sdk'

import { StationBoardService } from '../station-board.service';

@Component({
  selector: 'station-board-result',
  styleUrls: ['./station-board-result.component.scss'],
  templateUrl: './station-board-result.component.html',
})
export class StationBoardResultComponent implements OnInit, AfterViewInit {
  @ViewChild('stationBoardWrapper') stationBoardWrapperRef: ElementRef | undefined;
  public stopEventsData: OJP.StationBoardModel[]
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
        const stationBoardModel = stopEvent.asStationBoard();
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

  public hasDelay(stopEvent: OJP.StationBoardModel): boolean {
    const stationBoardTime = stopEvent.mapStationBoardTime[this.stationBoardType];
    if (!stationBoardTime) {
      return false;
    }

    return stationBoardTime.hasDelay;
  }

  public hasDelayDifferentTime(stopEvent: OJP.StationBoardModel): boolean {
    const stationBoardTime = stopEvent.mapStationBoardTime[this.stationBoardType];
    if (!stationBoardTime) {
      return false;
    }

    return stationBoardTime.hasDelayDifferentTime;
  }

  public formatStopEventTime(stopEvent: OJP.StationBoardModel, key: 'stopTime' | 'stopTimeActual' | 'stopDelayText'): string | null {
    const stationBoardTime = stopEvent.mapStationBoardTime[this.stationBoardType];
    if (stationBoardTime === null) {
      return null;
    }

    const timeF = stationBoardTime[key];
    return timeF;
  }

  public hasSituations(stopEvent: OJP.StationBoardModel): boolean {
    return stopEvent.stopSituations.length > 0;
  }
}
