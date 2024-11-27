import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { SbbExpansionPanel } from '@sbb-esta/angular/accordion';

import * as OJP from 'ojp-sdk'

import { DEBUG_LEVEL } from '../../config/app-config';
import { UserTripService } from '../../shared/services/user-trip.service';
import { MapService } from '../../shared/services/map.service';

interface TripHeaderStats {
  title: string,
  tripChangesInfo: string, 
  tripFromTime: string,
  tripToTime: string,
  tripDurationS: string,
  tripDistanceS: string,

  isCancelled: boolean,
  isInfeasable: boolean,
  isUnplanned: boolean,
}

@Component({
  selector: 'journey-result-row',
  templateUrl: './journey-result-row.component.html',
  styleUrls: ['./journey-result-row.component.scss'],
})
export class JourneyResultRowComponent implements OnInit {
  @Input() trip: OJP.Trip | undefined
  @Input() idx: number | undefined

  @ViewChild(SbbExpansionPanel, { static: true }) tripPanel: SbbExpansionPanel | undefined;

  public tripHeaderStats: TripHeaderStats

  constructor(private userTripService: UserTripService, private mapService: MapService) {
    this.tripHeaderStats = <TripHeaderStats>{}
  }

  ngOnInit() {
    if (this.trip) {
      this.initTripHeaderStats(this.trip)
    }

    const isFirstTrip = this.idx === 0
    if (this.tripPanel && isFirstTrip) {
      this.tripPanel.open()
    }

    this.tripPanel?.afterExpand.subscribe(ev => {
      if (this.trip) {
        this.userTripService.selectActiveTrip(this.trip);
        this.mapService.zoomToTrip(this.trip);
      }
    })
  }

  private initTripHeaderStats(trip: OJP.Trip) {
    this.tripHeaderStats.title = 'Trip ' + ((this.idx ?? 0) + 1);

    this.tripHeaderStats.isCancelled = trip.stats.isCancelled === true;
    this.tripHeaderStats.isInfeasable = trip.stats.isInfeasable === true;
    this.tripHeaderStats.isUnplanned = trip.stats.isUnplanned === true;
      
    if (trip.stats.transferNo === 0) {
      this.tripHeaderStats.tripChangesInfo = 'direct'
    } else if (trip.stats.transferNo === 1) {
      this.tripHeaderStats.tripChangesInfo = trip.stats.transferNo + ' transfer'
    } else {
      this.tripHeaderStats.tripChangesInfo = trip.stats.transferNo + ' transfers'
    }

    this.tripHeaderStats.tripFromTime = OJP.DateHelpers.formatTimeHHMM(trip.stats.startDatetime);
    
    this.tripHeaderStats.tripToTime = OJP.DateHelpers.formatTimeHHMM(trip.stats.endDatetime);
    const dayDiff = JourneyResultRowComponent.getDayOffset(trip.stats.endDatetime, trip.stats.startDatetime);
    if(dayDiff > 0){
      this.tripHeaderStats.tripToTime = '(+' + dayDiff + 'd) ' + this.tripHeaderStats.tripToTime;
    }

    this.tripHeaderStats.tripDurationS = trip.stats.duration.formatDuration()

    this.tripHeaderStats.tripDistanceS = (() => {
      if (DEBUG_LEVEL !== 'DEBUG') {
        return OJP.DateHelpers.formatDistance(trip.stats.distanceMeters);
      }

      const sourceF = trip.stats.distanceSource === 'trip' ? 'Δ' : 'Σ';
      const distanceF = OJP.DateHelpers.formatDistance(trip.stats.distanceMeters);

      return distanceF + ' ' + sourceF;
    })();
  }

  private static getDayOffset(start: Date, end: Date){
    return Math.ceil(
      Math.abs(
        new Date(Date.UTC(
          end.getUTCFullYear(),
          end.getUTCMonth(),
          end.getUTCDate()
        )).valueOf() -
        new Date(Date.UTC(
          start.getUTCFullYear(),
          start.getUTCMonth(),
          start.getUTCDate()
        )).valueOf()
      ) / (1000 * 3600 * 24)
    )
  }
}
