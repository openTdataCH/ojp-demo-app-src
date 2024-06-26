import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { SbbExpansionPanel } from '@sbb-esta/angular/accordion';
import { UserTripService } from 'src/app/shared/services/user-trip.service';
import * as OJP from 'ojp-sdk'

interface TripHeaderStats {
  title: string,
  tripChangesInfo: string, 
  tripFromTime: string,
  tripToTime: string,
  tripDurationS: string,
  tripDistanceS: string,
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

  constructor(private userTripService: UserTripService) {
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
      }
    })
  }

  private initTripHeaderStats(trip: OJP.Trip) {
    this.tripHeaderStats.title = 'Trip ' + ((this.idx ?? 0) + 1)
      
    if (trip.stats.transferNo === 0) {
      this.tripHeaderStats.tripChangesInfo = 'direct'
    } else if (trip.stats.transferNo === 1) {
      this.tripHeaderStats.tripChangesInfo = trip.stats.transferNo + ' transfer'
    } else {
      this.tripHeaderStats.tripChangesInfo = trip.stats.transferNo + ' transfers'
    }

    this.tripHeaderStats.tripFromTime = OJP.DateHelpers.formatTimeHHMM(trip.stats.startDatetime)
    this.tripHeaderStats.tripToTime = OJP.DateHelpers.formatTimeHHMM(trip.stats.endDatetime)

    this.tripHeaderStats.tripDurationS = trip.stats.duration.formatDuration()
    this.tripHeaderStats.tripDistanceS = OJP.DateHelpers.formatDistance(trip.stats.distanceMeters)
  }
}
