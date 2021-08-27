import { Component, Input, OnInit } from '@angular/core';
import { GeoPosition } from 'src/app/shared/ojp-sdk/location/geoposition';
import { MapService } from 'src/app/shared/services/map.service';

import * as OJP from '../../../shared/ojp-sdk/index'
import { MapLegTypeColor } from '../../../shared/ojp-sdk/index';

interface LegLocationData {
  locationText: string,
  // NOT YET IMPLEMENTED
  platformText: string | null,
  timeText: string | null,
  // NOT YET IMPLEMENTED
  delayText: string | null,
}

interface LegInfoDataModel {
  legColor: string,
  legIconPath: string,
  leadingText: string,
  
  hasGuidance: boolean,
  guidanceTextLines: string[],
  
  isWalking: boolean,
  walkingDurationText: string,
  walkingDistanceText: string,
  
  isTimed: boolean,
  fromLocationData: LegLocationData,
  toLocationData: LegLocationData,
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

  private computeLegLeadText(): string {
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
    this.legInfoDataModel.leadingText = this.computeLegLeadText()

    const isTransfer = leg.legType === 'TransferLeg'
    this.legInfoDataModel.guidanceTextLines = []

    if (isTransfer) {
      const transferLeg = leg as OJP.TripContinousLeg
      const guidanceSections = transferLeg.pathGuidance?.sections ?? []
      guidanceSections.forEach(section => {
        if (section.guidanceAdvice === null) {
          return
        }

        const lineTextParts = [
          section.guidanceAdvice ?? '',
          '(',
          section.turnAction ?? '',
          ') - ',
          section.trackSection?.roadName ?? '',
        ]

        const guidanceLength = section.trackSection?.length ?? 0
        if (guidanceLength > 0) {
          lineTextParts.push(' (')
          lineTextParts.push('' + guidanceLength)
          lineTextParts.push('m)')
        }

        const lineText = lineTextParts.join('')
        this.legInfoDataModel.guidanceTextLines.push(lineText)
      })
    }

    let isWalking = leg.legType === 'TransferLeg'
    const isContinous = leg.legType === 'ContinousLeg'
    if (isContinous) {
      const continousLeg = leg as OJP.TripContinousLeg
      isWalking = continousLeg.isWalking()

      if (isWalking) {
        this.legInfoDataModel.walkingDistanceText = continousLeg.formatDistance()
      }
    }
    this.legInfoDataModel.isWalking = isWalking

    if (isWalking) {
      this.legInfoDataModel.walkingDurationText = leg.legDuration?.formatDuration() ?? ''
    }

    this.legInfoDataModel.hasGuidance = this.legInfoDataModel.guidanceTextLines.length > 0

    const legIconFilename = this.computeLegIconFilename(leg)
    this.legInfoDataModel.legIconPath = 'assets/pictograms/' + legIconFilename + '.png'

    this.legInfoDataModel.isTimed = leg.legType === 'TimedLeg'
    this.legInfoDataModel.fromLocationData = this.computeLocationData(leg, 'From')
    this.legInfoDataModel.toLocationData = this.computeLocationData(leg, 'To')

    console.log(this.legInfoDataModel)
  }

  private computeLegIconFilename(leg: OJP.TripLeg): string {
    if (leg.legType === 'TransferLeg') {
      return 'picto-walk'
    }

    if (leg.legType === 'TimedLeg') {
      const timedLeg = leg as OJP.TripTimedLeg
      if (timedLeg.service.ptMode.isRail()) {
        return 'picto-railway'
      }

      if (timedLeg.service.ptMode.isDemandMode) {
        return 'car-sharing'
      }
    }

    if (leg.legType === 'ContinousLeg') {
      const continousLeg = leg as OJP.TripContinousLeg
      if (continousLeg.isSelfDriveCarLeg()) {
        return 'car-sharing'
      }

      if (continousLeg.isSharedMobility()) {
        return 'velo-sharing'
      }

      return 'picto-walk'
    }

    return 'picto-bus'
  }

  private computeLocationData(leg: OJP.TripLeg, endpointType: OJP.JourneyPointType): LegLocationData {
    const isFrom = endpointType === 'From'

    let location = isFrom ? leg.fromLocation : leg.toLocation

    const locationData = <LegLocationData>{
      locationText: location.locationName ?? '',
      platformText: null,
      timeText: null,
      delayText: null,
    }

    if (leg.legType === 'TimedLeg') {
      const timedLeg = leg as OJP.TripTimedLeg
      const stopPointTime = isFrom ? timedLeg.fromStopPoint.departureData : timedLeg.toStopPoint.arrivalData

      const depTime = stopPointTime?.timetableTime
      if (depTime) {
        locationData.timeText = OJP.DateHelpers.formatTimeHHMM(depTime)
      }
    }

    return locationData
  }

  public handleClickOnLocation(endpointType: OJP.JourneyPointType) {
    if (!this.leg) {
      return
    }

    const isFrom = endpointType === 'From'
    const location = isFrom ? this.leg.fromLocation : this.leg.toLocation

    this.mapService.tryToCenterAndZoomToLocation(location)
  }

}