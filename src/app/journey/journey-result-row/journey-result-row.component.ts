import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { SbbExpansionPanel } from '@sbb-esta/angular-business/accordion';
import { UserTripService } from 'src/app/shared/services/user-trip.service';
import * as OJP from '../../shared/ojp-sdk/index'

@Component({
  selector: 'journey-result-row',
  templateUrl: './journey-result-row.component.html',
})
export class JourneyResultRowComponent implements OnInit {
  @Input() trip: OJP.Trip | undefined
  @Input() idx: number | undefined

  @ViewChild(SbbExpansionPanel, { static: true }) tripPanel: SbbExpansionPanel | undefined;

  constructor(private userTripService: UserTripService) {

  }

  ngOnInit() {
    this.tripPanel?.expanded

    this.tripPanel?.afterExpand.subscribe(ev => {
      if (this.trip) {
        this.userTripService.activeTripSelected.emit(this.trip);
      }
    })
  }

  computeTripTitle(): string {
    return 'Trip ' + ((this.idx ?? 0) + 1);
  }
}
