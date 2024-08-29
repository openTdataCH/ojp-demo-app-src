import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { SbbDialog } from "@sbb-esta/angular/dialog";

import mapboxgl from 'mapbox-gl'
import * as OJP from 'ojp-sdk'

import { MapService } from '../../../shared/services/map.service'
import { OJPHelpers } from '../../../helpers/ojp-helpers';
import { LegStopPointData } from '../../../shared/components/service-stops.component'
import { TripInfoResultPopoverComponent } from './trip-info-result-popover/trip-info-result-popover.component';
import { SituationData } from '../../../shared/types/situation-type';

type LegTemplate = 'walk' | 'timed' | 'taxi';

type ServiceAttributeRenderModel = {
  icon: string,
  caption: string
}

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
  fromLocationData: LegStopPointData,
  toLocationData: LegStopPointData,
  intermediaryLocationsData: LegStopPointData[]

  hasSituations: boolean
  situations: SituationData[]

  legTemplate: LegTemplate

  serviceAttributes: ServiceAttributeRenderModel[]

  serviceDestinationText: string | null
  serviceInfo: string | null
  serviceIntermediaryStopsText: string | null
  serviceJourneyRef: string | null
}

@Component({
  selector: 'result-trip-leg',
  templateUrl: './result-trip-leg.component.html',
  styleUrls: ['./result-trip-leg.component.scss']
})
export class ResultTripLegComponent implements OnInit {
  @Input() leg: OJP.TripLeg | undefined
  @Input() legId: string | undefined
  @Input() legIdx: number | undefined
  @Input() isLastLeg = false

  public legElementId: string = 'n/a'

  public legInfoDataModel: LegInfoDataModel

  public isEmbed: boolean

  constructor(private mapService: MapService, private router: Router, private tripInfoResultPopover: SbbDialog) {
    this.legInfoDataModel = <LegInfoDataModel>{}
    this.isEmbed = this.router.url.indexOf('/embed/') !== -1;
  }

  ngOnInit() {
    if (this.leg === undefined || this.legIdx === undefined) {
      return;
    }

    this.legElementId = 'leg_' + this.legId;

    this.initLegInfo()
  }

  private computeLegLeadingText(): string {
    if (this.leg === undefined || this.legIdx === undefined) {
      return 'n/a'
    }

    const legIdxS = '' + (this.legIdx + 1) + '. ';

    if (this.leg.legType === 'TransferLeg') {
      const leadingTextTitle = 'Transfer'
      
      const continuousLeg = this.leg as OJP.TripContinousLeg
      let legDurationS = ''
      if (continuousLeg.walkDuration) {
        legDurationS = ' ' + continuousLeg.walkDuration.formatDuration()
      }
      
      return legIdxS + leadingTextTitle + legDurationS;
    }

    if (this.leg.legType === 'ContinousLeg') {
      const continuousLeg = this.leg as OJP.TripContinousLeg

      const leadingText = this.computeLegLeadingTextContinousLeg(continuousLeg);

      let legDurationS = ''
      if (this.leg.legDuration) {
        legDurationS = ' ' + this.leg.legDuration.formatDuration()
      }
      
      return legIdxS + leadingText + ' - ' + legDurationS;
    }

    if (this.leg.legType === 'TimedLeg') {
      const timedLeg = this.leg as OJP.TripTimedLeg

      let leadingText = timedLeg.service.ptMode.name;
      if (timedLeg.service.ptMode.isDemandMode) {
        leadingText = 'OnDemand ' + leadingText;
      }

      let legDurationS = ''
      if (this.leg.legDuration) {
        legDurationS = ' ' + this.leg.legDuration.formatDuration()
      }

      return legIdxS + leadingText + ' - ' + legDurationS;
    }

    return legIdxS + this.leg.legType;
  }

  private computeLegLeadingTextContinousLeg(continuousLeg: OJP.TripContinousLeg): string {
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
      if (continuousLeg.legTransportMode === 'others-drive-car') {
        return 'Limo';
      }
      
      return 'Taxi';
    }

    if (continuousLeg.legTransportMode === 'car-shuttle-train') {
      return 'Ride Autoverladezug';
    }

    if (continuousLeg.legTransportMode === 'car-ferry') {
      return 'Use Ferry';
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

  handleTapOnLegHeading() {
    if (!this.leg) {
      return
    }

    const legFeatures = this.leg.computeGeoJSONFeatures();
    const bbox = OJP.GeoPositionBBOX.initFromGeoJSONFeatures(legFeatures);

    if (!bbox.isValid()) {
      console.error('Invalid BBOX for leg');
      console.log(this.leg);
      return
    }

    const bounds = new mapboxgl.LngLatBounds(bbox.asFeatureBBOX())
    const mapData = {
      bounds: bounds,
    }
    this.mapService.newMapBoundsRequested.emit(mapData);
  }

  private computeLegColor(): string {
    return this.leg?.computeLegColor() ?? OJP.MapLegTypeColor.TimedLeg
  }

  private initLegInfo() {
    if (this.leg === undefined) {
      return;
    }

    const leg = this.leg;

    this.legInfoDataModel.legColor = this.computeLegColor()
    this.legInfoDataModel.leadingText = this.computeLegLeadingText()

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
      const defaultLegTemplate: LegTemplate = 'walk';
      
      if (isContinous) {
        const continousLeg = leg as OJP.TripContinousLeg;
        if (continousLeg.isTaxi()) {
          return 'taxi';
        }
      }

      if (leg.legType === 'TimedLeg') {
        return 'timed';
      }
      
      return defaultLegTemplate;
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

    const legIconFilename = OJPHelpers.computeIconFilenameForLeg(leg);
    this.legInfoDataModel.legIconPath = 'assets/pictograms/' + legIconFilename + '.png'

    this.legInfoDataModel.isTimed = leg.legType === 'TimedLeg'
    
    this.legInfoDataModel.fromLocationData = this.computeLocationData(leg, 'From');
    this.legInfoDataModel.toLocationData = this.computeLocationData(leg, 'To');

    this.legInfoDataModel.intermediaryLocationsData = (() => {
      const stopPointsData: LegStopPointData[] = [];

      if (leg.legType !== 'TimedLeg') {
        return stopPointsData;
      }

      const timedLeg = leg as OJP.TripTimedLeg;
      timedLeg.intermediateStopPoints.forEach(stopPoint => {
        const stopPointData = <LegStopPointData>{
          locationText: stopPoint.location.computeLocationName() ?? 'n/a',
        };

        OJPHelpers.updateLocationDataWithTime(stopPointData, stopPoint);

        stopPointsData.push(stopPointData);
      });

      return stopPointsData;
    })();

    this.legInfoDataModel.situations = (() => {
      const situationsData: SituationData[] = [];

      if (leg.legType !== 'TimedLeg') {
        return situationsData;
      }

      const timedLeg = leg as OJP.TripTimedLeg;
      return OJPHelpers.computeSituationsData(timedLeg.service.siriSituations);
    })();
    this.legInfoDataModel.hasSituations = this.legInfoDataModel.situations.length > 0;

    if (leg.legType === 'TimedLeg') {
      const timedLeg = leg as OJP.TripTimedLeg;
      
      this.legInfoDataModel.fromLocationData.platformAssistanceIconPath = this.computePlatformAssistanceIconPath(timedLeg, 'From');
      this.legInfoDataModel.fromLocationData.platformAssistanceTooltip = this.computePlatformAssistanceTooltip(timedLeg, 'From');

      this.legInfoDataModel.toLocationData.platformAssistanceIconPath = this.computePlatformAssistanceIconPath(timedLeg, 'To');
      this.legInfoDataModel.toLocationData.platformAssistanceTooltip = this.computePlatformAssistanceTooltip(timedLeg, 'To');
    }

    this.legInfoDataModel.serviceAttributes = this.computeServiceAttributeModel(leg);

    this.legInfoDataModel.serviceDestinationText = (() => {
      if (leg.legType !== 'TimedLeg') {
        return null;
      }

      const timedLeg = leg as OJP.TripTimedLeg;
      return timedLeg.service.destinationStopPlace?.stopPlaceName ?? 'n/a';
    })();

    this.legInfoDataModel.serviceInfo = (() => {
      if (leg.legType !== 'TimedLeg') {
        return null;
      }

      const timedLeg = leg as OJP.TripTimedLeg;
      return this.formatServiceName(timedLeg);
    })();

    this.legInfoDataModel.serviceIntermediaryStopsText = (() => {
      if (leg.legType !== 'TimedLeg') {
        return null;
      }

      const timedLeg = leg as OJP.TripTimedLeg;
      const intermediaryStopsNo = timedLeg.intermediateStopPoints.length;
      
      if (intermediaryStopsNo === 0) {
        return null;
      }

      if (intermediaryStopsNo === 1) {
        return '1 stop';
      }

      return intermediaryStopsNo + ' stops';
    })();

    this.legInfoDataModel.serviceInfo = (() => {
      if (leg.legType !== 'TimedLeg') {
        return null;
      }

      const timedLeg = leg as OJP.TripTimedLeg;
      return this.formatServiceName(timedLeg);
    })();

    this.legInfoDataModel.serviceJourneyRef = (() => {
      if (leg.legType !== 'TimedLeg') {
        return null;
      }

      const timedLeg = leg as OJP.TripTimedLeg;

      return timedLeg.service.journeyRef;
    })();
  }

  private formatServiceName(timedLeg: OJP.TripTimedLeg): string {
    const service = timedLeg.service;

    const nameParts: string[] = []

    if (service.serviceLineNumber) {
      if (!service.ptMode.isRail()) {
        nameParts.push(service.ptMode.shortName ?? service.ptMode.ptMode)
      }

      nameParts.push(service.serviceLineNumber)
      nameParts.push(service.journeyNumber ?? '')
    } else {
      nameParts.push(service.ptMode.shortName ?? service.ptMode.ptMode)
    }

    nameParts.push('(' + service.agencyCode + ')')

    return nameParts.join(' ')
  }

  private computeServiceAttributeModel(leg: OJP.TripLeg): ServiceAttributeRenderModel[] {
    const rows: ServiceAttributeRenderModel[] = [];

    if (leg.legType !== 'TimedLeg') {
      return rows;
    }

    const timedLeg = leg as OJP.TripTimedLeg;
    for (const [key, attrData] of Object.entries(timedLeg.service.serviceAttributes)) {
      const icon: string | null = (() => {
        if (key.startsWith('ojp')) {
          return null;
        }

        if (key.toLowerCase().startsWith('i_')) {
          return 'kom:circle-information-large';
        }

        if (['sa-ba', 'ba', 'sa-hl', 'hl'].includes(key.toLowerCase())) {
          return 'kom:circle-information-large';
        }

        const icon = 'fpl:sa-' + key.toLowerCase();
        
        return icon;
      })();

      if (icon === null) {
        continue;
      }

      const rowData: ServiceAttributeRenderModel = {
        icon: icon,
        caption: attrData.text
      };
      rows.push(rowData);
    }

    return rows;
  }

  private computePlatformAssistanceIconPath(timedLeg: OJP.TripTimedLeg, stopPointType: OJP.JourneyPointType): string | null {
    const stopPoint = stopPointType === 'From' ? timedLeg.fromStopPoint : timedLeg.toStopPoint;

    const filename: string | null = (() => {
      if (stopPoint.vehicleAccessType === 'PLATFORM_ACCESS_WITHOUT_ASSISTANCE') {
        return 'platform_independent';
      }

      if (stopPoint.vehicleAccessType === 'PLATFORM_ACCESS_WITH_ASSISTANCE') {
        return 'platform_help_driver';
      }

      if (stopPoint.vehicleAccessType === 'PLATFORM_ACCESS_WITH_ASSISTANCE_WHEN_NOTIFIED') {
        return 'platform_advance_notice';
      }

      if (stopPoint.vehicleAccessType === 'PLATFORM_NOT_WHEELCHAIR_ACCESSIBLE') {
        return 'platform_not_possible';
      }

      if (stopPoint.vehicleAccessType === 'NO_DATA') {
        return 'platform_no_information';
      }

      return null;
    })();

    if (filename === null) {
      return null;
    }
    
    const iconPath = 'assets/platform-assistance/' + filename + '.jpg';
    return iconPath;
  }

  private computePlatformAssistanceTooltip(timedLeg: OJP.TripTimedLeg, stopPointType: OJP.JourneyPointType): string {
    const stopPoint = stopPointType === 'From' ? timedLeg.fromStopPoint : timedLeg.toStopPoint;

    const message: string = (() => {
      if (stopPoint.vehicleAccessType === 'PLATFORM_ACCESS_WITHOUT_ASSISTANCE') {
        return 'Step-free access; level entry/exit.';
      }

      if (stopPoint.vehicleAccessType === 'PLATFORM_ACCESS_WITH_ASSISTANCE') {
        return 'Step-free access; entry/exit through staff assistance, no prior registration necessary.';
      }

      if (stopPoint.vehicleAccessType === 'PLATFORM_ACCESS_WITH_ASSISTANCE_WHEN_NOTIFIED') {
        return 'Step-free access; entry/exit through staff assistance, advance registration required.';
      }

      if (stopPoint.vehicleAccessType === 'PLATFORM_NOT_WHEELCHAIR_ACCESSIBLE') {
        return 'Not usable for wheelchairs.';
      }

      return 'No available information about vehicle access.';
    })();

    return message;
  }

  private computeLocationData(leg: OJP.TripLeg, endpointType: OJP.JourneyPointType): LegStopPointData {
    const isFrom = endpointType === 'From'

    let location = isFrom ? leg.fromLocation : leg.toLocation

    const stopPointData = <LegStopPointData>{
      locationText: location.computeLocationName() ?? '',
      platformText: null,
      arrText: null,
      arrDelayText: null,
      depText: null,
      depDelayText: null,
    }

    if (leg.legType === 'TimedLeg') {
      const timedLeg = leg as OJP.TripTimedLeg
      const stopPoint = isFrom ? timedLeg.fromStopPoint : timedLeg.toStopPoint;

      OJPHelpers.updateLocationDataWithTime(stopPointData, stopPoint);
    }

    return stopPointData
  }

  public handleClickOnLocation(endpointType: OJP.JourneyPointType) {
    if (!this.leg) {
      return
    }

    const isFrom = endpointType === 'From'
    const location = isFrom ? this.leg.fromLocation : this.leg.toLocation

    this.mapService.tryToCenterAndZoomToLocation(location)
  }

  public loadTripInfoResultPopover(journeyRef: string | null) {
    if (journeyRef === null) {
      console.error('loadTripInfoResultPopover: cant fetch empty journeyRef');
      return;
    }

    const dialogRef = this.tripInfoResultPopover.open(TripInfoResultPopoverComponent, {
      position: { top: '20px' },
    });
    dialogRef.afterOpened().subscribe(() => {
      const popover = dialogRef.componentInstance as TripInfoResultPopoverComponent;
      popover.fetchJourneyRef(journeyRef);
    });
  }
}
