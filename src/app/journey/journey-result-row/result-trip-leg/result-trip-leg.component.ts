import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';

import { SbbDialog } from "@sbb-esta/angular/dialog";

import mapboxgl from 'mapbox-gl'
import * as OJP from 'ojp-sdk-v2';

import { DEBUG_LEVEL } from '../../../config/constants';
import { MapLegLineTypeColor } from '../../../config/map-colors';
import { OJPHelpers } from '../../../helpers/ojp-helpers';
import { OJPMapHelpers } from '../../../helpers/ojp-map-helpers';

import { MapService } from '../../../shared/services/map.service';
import { UserTripService } from '../../../shared/services/user-trip.service';
import { LegStopPointData } from '../../../shared/components/service-stops.component';

import { TripLegGeoController } from '../../../shared/controllers/trip-geo-controller';

import { TripInfoResultPopoverComponent } from './trip-info-result-popover/trip-info-result-popover.component';

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
  situations: OJP.SituationContent[]

  legTemplate: LegTemplate

  serviceAttributes: ServiceAttributeRenderModel[]

  serviceDestinationText: string | null
  serviceInfo: string | null
  serviceIntermediaryStopsText: string | null
  serviceJourneyRef: string | null
  debugServicePtMode: boolean
  servicePtMode: OJP.PublicTransportMode | null

  isCancelled: boolean
  hasDeviation: boolean
  isUnplanned: boolean
}

@Component({
  selector: 'result-trip-leg',
  templateUrl: './result-trip-leg.component.html',
  styleUrls: ['./result-trip-leg.component.scss']
})
export class ResultTripLegComponent implements OnInit {
  @Input() leg: OJP.TripLeg | undefined;
  @Input() legId: string | undefined;
  @Input() legIdx: number | undefined;
  @Input() isLastLeg = false;
  @Input() isForceLinkProjection: boolean | undefined;

  @Output() legMapRedrawRequest = new EventEmitter<{ legIdx: number, checked: boolean }>();

  public legElementId: string = 'n/a'

  public legInfoDataModel: LegInfoDataModel

  public isEmbed: boolean

  constructor(private mapService: MapService, private router: Router, private tripInfoResultPopover: SbbDialog, private userTripService: UserTripService) {
    this.legInfoDataModel = <LegInfoDataModel>{}
    this.isEmbed = this.router.url.indexOf('/embed/') !== -1;
  }

  ngOnInit() {
    if (this.leg === undefined || this.legIdx === undefined) {
      return;
    }

    this.legElementId = 'leg_' + this.legId;

    this.initLegInfo();
  }

  private computeLegLeadingText(): string {
    if (this.leg === undefined || this.legIdx === undefined) {
      return 'n/a';
    }

    const legIdxS = '' + (this.legIdx + 1) + '. ';

    if (this.leg.legType === 'TransferLeg') {
      const leadingTextTitle = 'Transfer';
      
      const continuousLeg = this.leg as OJP.TripContinuousLeg;
      let legDurationS = '';
      if (continuousLeg.walkDuration) {
        legDurationS = ' ' + continuousLeg.walkDuration.formatDuration()
      }
      
      return legIdxS + leadingTextTitle + legDurationS;
    }

    if (this.leg.legType === 'ContinuousLeg') {
      const continuousLeg = this.leg as OJP.TripContinuousLeg;

      const leadingText = this.computeLegLeadingTextContinousLeg(continuousLeg);

      let legDurationS = '';
      if (this.leg.legDuration) {
        legDurationS = ' ' + this.leg.legDuration.formatDuration();
      }
      
      return legIdxS + leadingText + ' - ' + legDurationS;
    }

    if (this.leg.legType === 'TimedLeg') {
      const timedLeg = this.leg as OJP.TripTimedLeg;

      let leadingText = timedLeg.service.ptMode.name;
      if (leadingText === null) {
        leadingText = timedLeg.service.ptMode.ptMode;
      }

      if (timedLeg.service.ptMode.isDemandMode) {
        leadingText = 'OnDemand ' + leadingText;
      }

      let legDurationS = '';
      if (this.leg.legDuration) {
        legDurationS = ' ' + this.leg.legDuration.formatDuration();
      }

      return legIdxS + leadingText + ' - ' + legDurationS;
    }

    return legIdxS + this.leg.legType;
  }

  private computeLegLeadingTextContinousLeg(continuousLeg: OJP.TripContinuousLeg): string {
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

    if (this.leg.legType === 'ContinuousLeg') {
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

    const tripLegGeoController = new TripLegGeoController(this.leg);

    const legFeatures = tripLegGeoController.computeGeoJSONFeatures();
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

  public get checkboxId() {
    return 'lp_checkbox_' + this.legId;
  }

  public redrawTripLeg(event: Event) {
    if (!this.leg || (this.legIdx === undefined)) {
      return;
    }

    const isChecked = (event.target as HTMLInputElement).checked;

    this.legMapRedrawRequest.emit({
      legIdx: this.legIdx,
      checked: isChecked,
    });
  }

  private computeLegColor(): string {
    const defaultColor = MapLegLineTypeColor.Unknown;

    if (!this.leg) {
      return defaultColor;
    }

    const legType = this.leg.legType;

    if (legType === 'ContinuousLeg' || legType === 'TransferLeg') {
      const leg = this.leg as OJP.TripContinuousLeg;
      return this.computeContinousLegColor(leg);
    }

    if (legType === 'TimedLeg') {
      const leg = this.leg as OJP.TripTimedLeg;
      return OJPMapHelpers.computeTimedLegColor(leg);
    }

    return defaultColor;
  }

  private computeContinousLegColor(leg: OJP.TripContinuousLeg): string {
    if (leg.isDriveCarLeg()) {
      return MapLegLineTypeColor['Self-Drive Car']
    }

    if (leg.isSharedMobility()) {
      return MapLegLineTypeColor['Shared Mobility']
    }

    if (leg.legType === 'TransferLeg') {
      return MapLegLineTypeColor.Transfer
    }

    if (leg.isTaxi()) {
      return MapLegLineTypeColor.OnDemand;
    }

    if (leg.legTransportMode === 'car-ferry') {
      return MapLegLineTypeColor.Water;
    }

    return MapLegLineTypeColor.Walk;
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
      const transferLeg = leg as OJP.TripContinuousLeg;
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
    const isContinous = leg.legType === 'ContinuousLeg';
    if (isContinous) {
      const continousLeg = leg as OJP.TripContinuousLeg;
      isWalking = continousLeg.isWalking()

      if (isWalking) {
        this.legInfoDataModel.distanceText = continousLeg.formatDistance()
      }
    }
    this.legInfoDataModel.isWalking = isWalking;

    this.legInfoDataModel.legTemplate = (() => {
      const defaultLegTemplate: LegTemplate = 'walk';
      
      if (isContinous) {
        const continousLeg = leg as OJP.TripContinuousLeg;
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

      const continousLeg = leg as OJP.TripContinuousLeg;
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
      if (leg.legType !== 'TimedLeg') {
        return [];
      }

      const timedLeg = leg as OJP.TripTimedLeg;
      const timedLegSituations = timedLeg.service.siriSituations;
      const situationsData = OJPHelpers.computeSituationsData(timedLegSituations);
      
      if (DEBUG_LEVEL === 'DEBUG') {
        if ((timedLegSituations.length > 0) && (situationsData.length === 0)) {
          console.error('ResultTripLegComponent.initLegInfo ERROR - have situations but cant extract data from them');
          console.log(timedLegSituations);
          console.log('========================================================');
        }
      }  

      return situationsData;
    })();
    this.legInfoDataModel.hasSituations = this.legInfoDataModel.situations.length > 0;

    if (leg.legType === 'TimedLeg') {
      const timedLeg = leg as OJP.TripTimedLeg;
      
      this.legInfoDataModel.fromLocationData.platformAssistanceIconPath = OJPHelpers.computePlatformAssistanceIconPath(timedLeg.fromStopPoint);
      this.legInfoDataModel.fromLocationData.platformAssistanceTooltip = OJPHelpers.computePlatformAssistanceTooltip(timedLeg.fromStopPoint);

      this.legInfoDataModel.toLocationData.platformAssistanceIconPath = OJPHelpers.computePlatformAssistanceIconPath(timedLeg.toStopPoint);
      this.legInfoDataModel.toLocationData.platformAssistanceTooltip = OJPHelpers.computePlatformAssistanceTooltip(timedLeg.toStopPoint);
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

    this.legInfoDataModel.debugServicePtMode = DEBUG_LEVEL === 'DEBUG';
    this.legInfoDataModel.servicePtMode = (() => {
      if (leg.legType !== 'TimedLeg') {
        return null;
      }

      const timedLeg = leg as OJP.TripTimedLeg;
      return timedLeg.service.ptMode;
    })();

    this.legInfoDataModel.isCancelled = (() => {
      if (leg.legType !== 'TimedLeg') {
        return false;
      }

      const timedLeg = leg as OJP.TripTimedLeg;

      return timedLeg.service.hasCancellation === true;
    })();

    this.legInfoDataModel.hasDeviation = (() => {
      if (leg.legType !== 'TimedLeg') {
        return false;
      }

      const timedLeg = leg as OJP.TripTimedLeg;

      return timedLeg.service.hasDeviation === true;
    })();

    this.legInfoDataModel.isUnplanned = (() => {
      if (leg.legType !== 'TimedLeg') {
        return false;
      }

      const timedLeg = leg as OJP.TripTimedLeg;

      return timedLeg.service.isUnplanned === true;
    })();
  }

  private formatServiceName(timedLeg: OJP.TripTimedLeg): string {
    const service = timedLeg.service;

    const serviceName = OJPHelpers.formatServiceName(service);

    return serviceName;
  }

  private computeServiceAttributeModel(leg: OJP.TripLeg): ServiceAttributeRenderModel[] {
    const rows: ServiceAttributeRenderModel[] = [];

    if (leg.legType !== 'TimedLeg') {
      return rows;
    }

    const timedLeg = leg as OJP.TripTimedLeg;
    for (const [key, attrData] of Object.entries(timedLeg.service.serviceAttributes)) {
      const icon: string = (() => {
        if (key.startsWith('A_')) {
          const code = key.replace(/A_*/, '');
          const standardIcon = 'fpl:sa-' + code.toLowerCase();
          return standardIcon;
        }

        const defaultIcon = 'kom:circle-question-mark-medium';
        return defaultIcon;
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

  public loadTripInfoResultPopover() {
    const journeyRef = this.legInfoDataModel.serviceJourneyRef;
    const dayRef = OJP.DateHelpers.formatDate(this.userTripService.departureDate).substring(0, 10);

    if (journeyRef === null) {
      console.error('loadTripInfoResultPopover: cant fetch empty journeyRef');
      return;
    }

    const dialogRef = this.tripInfoResultPopover.open(TripInfoResultPopoverComponent, {
      position: { top: '20px' },
    });
    dialogRef.afterOpened().subscribe(() => {
      const popover = dialogRef.componentInstance as TripInfoResultPopoverComponent;
      popover.fetchJourneyRef(journeyRef, dayRef);
    });
  }
}
