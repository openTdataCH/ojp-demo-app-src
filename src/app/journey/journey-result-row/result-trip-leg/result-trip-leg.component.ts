import { Component, Input, OnInit } from '@angular/core';
import { GeoPosition } from 'src/app/shared/ojp-sdk/location/geoposition';
import { GeoPositionBBOX } from 'src/app/shared/ojp-sdk/location/geoposition-bbox';
import { MapService } from 'src/app/shared/services/map.service';

import * as OJP from '../../../shared/ojp-sdk/index'

@Component({
  selector: 'result-trip-leg',
  templateUrl: './result-trip-leg.component.html',
  styleUrls: ['./result-trip-leg.component.scss']
})

export class ResultTripLegComponent implements OnInit {
  @Input() leg: OJP.TripLeg | undefined
  @Input() isLastLeg: boolean = false

  constructor(private mapService: MapService) {
  }

  ngOnInit() {}

  computeLegInfo(): string {
    if (!this.leg) {
      return ''
    }

    const leg = this.leg

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

  computeLegPillClassName(): string {
    if (!this.leg) {
      return ''
    }

    if (this.leg.legType === 'ContinousLeg') {
      return 'continous-leg-pill'
    }

    if (this.leg.legType === 'TimedLeg') {
      return 'timed-leg-pill'
    }

    if (this.leg.legType === 'TransferLeg') {
      return 'transfer-leg-pill'
    }

    return ''
  }
}
