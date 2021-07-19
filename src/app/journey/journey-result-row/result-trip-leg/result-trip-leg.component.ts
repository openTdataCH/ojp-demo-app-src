import { Component, Input, OnInit } from '@angular/core';
import { GeoPosition } from 'src/app/shared/ojp-sdk/location/geoposition';
import { MapService } from 'src/app/shared/services/map.service';

import * as OJP from '../../../shared/ojp-sdk/index'
import { MapLegTypeColor } from '../../../shared/ojp-sdk/index';

interface LegInfoDataModel {
  legColor: string,
  leadingText: string,
  legInfo: string,
}

@Component({
  selector: 'result-trip-leg',
  templateUrl: './result-trip-leg.component.html',
  styleUrls: ['./result-trip-leg.component.scss']
})
export class ResultTripLegComponent implements OnInit {
  @Input() leg: OJP.TripLeg | undefined

  legInfoDataModel: LegInfoDataModel

  constructor(private mapService: MapService) {
    this.legInfoDataModel = <LegInfoDataModel>{}
  }

  ngOnInit() {
    if (this.leg) {
      this.initLegInfo(this.leg)
    }
  }

  private computeLegInfo(): string {
    if (!this.leg) {
      return ''
    }

    const leg = this.leg

    const titleParts: string[] = []

    if (leg.legType === 'TimedLeg') {
      const timedLeg = leg as OJP.TripTimedLeg

      titleParts.push(leg.fromLocation.locationName ?? '')
      const depTime = timedLeg.fromStopPoint.departureData?.timetableTime
      if (depTime) {
        titleParts.push('(' + OJP.DateHelpers.formatTimeHHMM(depTime) + ')');
      }

      titleParts.push(' - ')

      titleParts.push(leg.toLocation.locationName ?? '')
      const arrTime = timedLeg.toStopPoint.arrivalData?.timetableTime;
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

  private computeLegPill(): string {
    if (this.leg === undefined) {
      return 'n/a'
    }

    if (this.leg.legType === 'TransferLeg') {
      const leadingTextTitle = 'Transfer'
      
      const continuousLeg = this.leg as OJP.TripContinousLeg
      let legDurationS = ''
      if (continuousLeg.walkDuration) {
        legDurationS = ' ' + continuousLeg.walkDuration.formatDuration()
      }
      
      return leadingTextTitle + legDurationS
    }

    if (this.leg.legType === 'ContinousLeg') {
      const continuousLeg = this.leg as OJP.TripContinousLeg

      let leadingTextTitle = 'Walk'
      if (continuousLeg.isSelfDriveCarLeg()) {
        leadingTextTitle = 'Drive'
      }
      if (continuousLeg.isSharedMobility()) {
        leadingTextTitle = 'Cycle'
      }

      let legDurationS = ''
      if (this.leg.legDuration) {
        legDurationS = ' ' + this.leg.legDuration.formatDuration()
      }
      
      return leadingTextTitle + legDurationS
    }

    if (this.leg.legType === 'TimedLeg') {
      const timedLeg = this.leg as OJP.TripTimedLeg
      const serviceName = timedLeg.service.formatServiceName()

      let legDurationS = ''
      if (this.leg.legDuration) {
        legDurationS = ' ' + this.leg.legDuration.formatDuration()
      }

      return serviceName + legDurationS
    }

    return this.leg.legType
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

  handleTapOnPill() {
    if (!this.leg) {
      return
    }

    const legFeatures = this.leg.computeGeoJSONFeatures();

    const bbox = new OJP.GeoPositionBBOX([])
    legFeatures.forEach(feature => {
      const featureBBOX = feature.bbox;
      if (featureBBOX) {
        const bboxSW = new GeoPosition(featureBBOX[0], featureBBOX[1])
        bbox.extend(bboxSW)

        const bboxNE = new GeoPosition(featureBBOX[2], featureBBOX[3])
        bbox.extend(bboxNE)
      }
    })

    if (!bbox.isValid()) {
      console.error('Invalid BBOX for leg');
      console.log(this.leg);
      return
    }

    const bounds = bbox.asLngLatBounds();

    const minDistanceM = 20
    const hasSmallBBOX = bounds.getSouthWest().distanceTo(bounds.getNorthEast()) < minDistanceM
    if (hasSmallBBOX) {
      const mapData = {
        lnglat: bounds.getCenter(),
        zoom: 16
      }
      this.mapService.newMapCenterAndZoomRequested.emit(mapData);
    } else {
      const mapData = {
        bounds: bounds
      }
      this.mapService.newMapBoundsRequested.emit(mapData);
    }
  }

  private computeLegColor(): string {
    return this.leg?.computeLegColor() ?? MapLegTypeColor.TimedLeg
  }

  private initLegInfo(leg: OJP.TripLeg) {
    this.legInfoDataModel.legColor = this.computeLegColor()
    this.legInfoDataModel.leadingText = this.computeLegPill()
    this.legInfoDataModel.legInfo = this.computeLegInfo()
  }
}
