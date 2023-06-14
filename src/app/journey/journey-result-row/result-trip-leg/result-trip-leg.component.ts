import { Component, Input, OnInit } from '@angular/core';
import { MapService } from 'src/app/shared/services/map.service';

import mapboxgl from 'mapbox-gl'
import * as OJP from 'ojp-sdk'

interface LegLocationData {
  locationText: string,
  platformText: string | null,
  actualPlatformText: string | null,
  timeText: string | null,
  delayText: string | null,
}

type LegTemplate = 'walk' | 'timed' | 'taxi';

interface LegInfoDataModel {
  legColor: string,
  legIconPath: string,
  leadingText: string,
  
  hasGuidance: boolean,
  guidanceTextLines: string[]
  bookingArrangements: OJP.BookingArrangement[]
  
  isWalking: boolean,
  durationText: string,
  distanceText: string,
  
  isTimed: boolean,
  fromLocationData: LegLocationData,
  toLocationData: LegLocationData,

  legTemplate: LegTemplate
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

      const leadingText = this.computeLegLeadTextContinousLeg(continuousLeg);

      let legDurationS = ''
      if (this.leg.legDuration) {
        legDurationS = ' ' + this.leg.legDuration.formatDuration()
      }
      
      return leadingText + legDurationS
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

  private computeLegLeadTextContinousLeg(continuousLeg: OJP.TripContinousLeg): string {
    if (continuousLeg.legTransportMode === 'walk') {
      return 'Walk';
    }

    if (continuousLeg.isDriveCarLeg()) {
      return 'Drive';
    }

    if (continuousLeg.isSharedMobility()) {
      return 'Ride';
    }

    if (continuousLeg.isTaxi()) {
      return 'Taxi';
    }

    return 'PLACEHOLDER - NEW MOT?';
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
        const bboxSW = new OJP.GeoPosition(featureBBOX[0], featureBBOX[1])
        bbox.extend(bboxSW)

        const bboxNE = new OJP.GeoPosition(featureBBOX[2], featureBBOX[3])
        bbox.extend(bboxNE)
      }
    })

    if (!bbox.isValid()) {
      console.error('Invalid BBOX for leg');
      console.log(this.leg);
      return
    }

    const bounds = new mapboxgl.LngLatBounds(bbox.asFeatureBBOX())

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
    return this.leg?.computeLegColor() ?? OJP.MapLegTypeColor.TimedLeg
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
        this.legInfoDataModel.distanceText = continousLeg.formatDistance()
      }
    }
    this.legInfoDataModel.isWalking = isWalking;

    this.legInfoDataModel.legTemplate = (() => {
      const degaultLegTemplate: LegTemplate = 'timed';
      if (isWalking) {
        return 'walk';
      }
      if (isContinous) {
        const continousLeg = leg as OJP.TripContinousLeg;
        if (continousLeg.isTaxi()) {
          return 'taxi';
        }
      }
      
      return degaultLegTemplate;
    })();

    this.legInfoDataModel.bookingArrangements = (() => {
      if (!isContinous) {
        return [];
      }

      const continousLeg = leg as OJP.TripContinousLeg;
      if (continousLeg.serviceBooking === null) {
        return [];
      }

      return continousLeg.serviceBooking.bookingArrangements;
    })();

    this.legInfoDataModel.durationText = leg.legDuration?.formatDuration() ?? ''

    this.legInfoDataModel.hasGuidance = this.legInfoDataModel.guidanceTextLines.length > 0

    const legIconFilename = this.computeLegIconFilename(leg)
    this.legInfoDataModel.legIconPath = 'assets/pictograms/' + legIconFilename + '.png'

    this.legInfoDataModel.isTimed = leg.legType === 'TimedLeg'
    this.legInfoDataModel.fromLocationData = this.computeLocationData(leg, 'From')
    this.legInfoDataModel.toLocationData = this.computeLocationData(leg, 'To')
  }

  private computeLegIconFilename(leg: OJP.TripLeg): string {
    if (leg.legType === 'TransferLeg') {
      return 'picto-walk'
    }

    if (leg.legType === 'TimedLeg') {
      const timedLeg = leg as OJP.TripTimedLeg
      return timedLeg.service.ptMode.computePublicTransportPictogram();
    }

    if (leg.legType === 'ContinousLeg') {
      const continousLeg = leg as OJP.TripContinousLeg
      if (continousLeg.isDriveCarLeg()) {
        return 'car-sharing'
      }

      if (continousLeg.isSharedMobility()) {
        return 'velo-scooter-sharing'
      }

      if (continousLeg.isTaxi()) {
        return 'taxi';
      }

      return 'picto-walk'
    }

    return 'picto-bus-fallback';
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
      const stopPoint = isFrom ? timedLeg.fromStopPoint : timedLeg.toStopPoint
      
      const stopPointTime = isFrom ? stopPoint.departureData : stopPoint.arrivalData
      const depTime = stopPointTime?.timetableTime
      if (depTime) {
        locationData.timeText = OJP.DateHelpers.formatTimeHHMM(depTime)

        const delayMinutes = stopPointTime?.delayMinutes
        if (delayMinutes) {
          const delayTextParts: string[] = []
          delayTextParts.push(' ')
          delayTextParts.push(delayMinutes > 0 ? '+' : '')
          delayTextParts.push('' + delayMinutes)
          delayTextParts.push("'")

          locationData.delayText = delayTextParts.join('')
        }
      }

      locationData.platformText = stopPoint.plannedPlatform
      locationData.actualPlatformText = stopPoint.actualPlatform
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
