import { Component, Input, OnInit } from '@angular/core';
import * as OJP from '../../shared/ojp-sdk/index'

@Component({
  selector: 'journey-result-row',
  templateUrl: './journey-result-row.component.html',
})
export class JourneyResultRowComponent implements OnInit {
  @Input() trip: OJP.Trip | undefined
  @Input() idx: number | undefined

  ngOnInit() {

  }

  computeTripTitle(): string {
    return 'Trip ' + ((this.idx ?? 0) + 1);
  }

  computeLegTitle(leg: OJP.TripLeg): string {
    const titleParts: string[] = [leg.legType + ': ']

    if (leg.legType === 'TimedLeg') {
      const timedLeg = leg as OJP.TripTimedLeg

      titleParts.push(leg.fromLocation.locationName ?? '')
      const depTime = timedLeg.fromEndpoint.departureData.timetabledTime
      if (depTime) {
        titleParts.push('(' + OJP.DateHelpers.formatTimeHHMM(depTime) + ')');
      }

      titleParts.push(' - ')

      titleParts.push(leg.toLocation.locationName ?? '')
      const arrTime = timedLeg.toEndpoint.arrivalData.timetabledTime;
      if (arrTime) {
        titleParts.push('(' + OJP.DateHelpers.formatTimeHHMM(arrTime) + ')');
      }
    } else {
      titleParts.push(leg.fromLocation.locationName ?? '')
      titleParts.push(' - ')
      titleParts.push(leg.toLocation.locationName ?? '')
    }

    return titleParts.join('')
  }
}
