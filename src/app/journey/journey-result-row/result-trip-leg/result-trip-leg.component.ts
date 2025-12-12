import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';

import mapboxgl from 'mapbox-gl';

import { SbbDialog } from "@sbb-esta/angular/dialog";

import OJP_Legacy from '../../../config/ojp-legacy';
import * as OJP_Next from 'ojp-sdk-next';

import { DEBUG_LEVEL, OJP_VERSION } from '../../../config/constants';

import { MapLegLineTypeColor } from '../../../config/map-colors';
import { OJPHelpers } from '../../../helpers/ojp-helpers';

import { MapService } from '../../../shared/services/map.service';
import { UserTripService } from '../../../shared/services/user-trip.service';
import { LegStopPointData } from '../../../shared/components/service-stops.component';

import { TripLegGeoController } from '../../../shared/controllers/trip-geo-controller';

import { TripInfoResultPopoverComponent } from './trip-info-result-popover/trip-info-result-popover.component';
import { TripLegData } from '../../../shared/types/trip';
import { DebugXmlPopoverComponent } from '../../../search-form/debug-xml-popover/debug-xml-popover.component';
import { JourneyService } from '../../../shared/models/journey-service';
import { PlaceLocation } from '../../../shared/models/place/location';
import { GeoPositionBBOX } from '../../../shared/models/geo/geoposition-bbox';
import { SituationContent } from '../../../shared/models/situation';

type LegTemplate = 'walk' | 'timed' | 'taxi';

type ServiceAttributeRenderModel = {
  icon: string,
  caption: string
}

interface GuidanceRow {
  turnDescription: string
  advice: string
  lengthF: string
  durationF: string
  streetName: string
  geojsonFeature: GeoJSON.Feature<GeoJSON.LineString> | null
}
interface LegInfoDataModel {
  legColor: string,
  legIconPath: string,
  leadingText: string,
  
  guidanceRows: GuidanceRow[],
  bookingArrangements: OJP_Legacy.BookingArrangement[]
  
  isWalking: boolean,
  durationText: string,
  distanceText: string,
  
  isTimed: boolean,
  fromLocationData: LegStopPointData,
  toLocationData: LegStopPointData,
  intermediaryLocationsData: LegStopPointData[],

  hasSituations: boolean,
  situations: SituationContent[],

  legTemplate: LegTemplate,

  serviceAttributes: ServiceAttributeRenderModel[],

  serviceDestinationText: string | null,
  serviceInfo: string | null,
  serviceIntermediaryStopsText: string | null,
  serviceJourneyRef: string | null,
  debugServicePtMode: boolean,
  servicePtMode: OJP_Legacy.PublicTransportMode | null,
  serviceFormationURL: string | null,

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
  @Input() legData: TripLegData | undefined;
  @Input() legIdx: number | undefined;
  @Input() isForceLinkProjection: boolean | undefined;
  @Input() trrRequestInfo: OJP_Next.RequestInfo | undefined;

  @Output() legReloadRequest = new EventEmitter<void>();
  @Output() legMapRedrawRequest = new EventEmitter<{ legIdx: number, checked: boolean }>();

  public legElementId: string = 'n/a';

  public legInfoDataModel: LegInfoDataModel;

  public isEmbed: boolean;

  public enableTRR: boolean;

  constructor(
    private mapService: MapService, 
    private router: Router, 
    private popover: SbbDialog, 
    private userTripService: UserTripService, 
    private sanitizer: DomSanitizer,
  ) {
    this.legInfoDataModel = <LegInfoDataModel>{}
    this.isEmbed = this.router.url.indexOf('/embed/') !== -1;

    const isOJPv2 = OJP_VERSION === '2.0';
    this.enableTRR = isOJPv2;
  }

  ngOnInit() {
    if (this.legData === undefined) {
      return;
    }

    this.legElementId = 'leg_' + this.legData.leg.legID;
    this.initLegInfo();
  }
  
  private computeLegLeadingText(): string {
    if (this.legData === undefined) {
      return 'n/a';
    }

    const legIdxS = '' + (this.legData.info.id) + '. ';

    if (this.legData.leg.legType === 'TransferLeg') {
      const leadingTextTitle = 'Transfer';
      
      const continuousLeg = this.legData.leg as OJP_Legacy.TripContinuousLeg;
      let legDurationS = '';
      if (continuousLeg.walkDuration) {
        legDurationS = ' ' + continuousLeg.walkDuration.formatDuration()
      }
      
      return legIdxS + leadingTextTitle + legDurationS;
    }

    if (this.legData.leg.legType === 'ContinuousLeg') {
      const continuousLeg = this.legData.leg as OJP_Legacy.TripContinuousLeg;

      const leadingText = this.computeLegLeadingTextContinousLeg(continuousLeg);

      let legDurationS = '';
      if (this.legData.leg.legDuration) {
        legDurationS = ' ' + this.legData.leg.legDuration.formatDuration();
      }
      
      return legIdxS + leadingText + ' - ' + legDurationS;
    }

    if (this.legData.leg.legType === 'TimedLeg') {
      const timedLeg = this.legData.leg as OJP_Legacy.TripTimedLeg;

      let leadingText = timedLeg.service.ptMode.name;
      if (leadingText === null) {
        leadingText = timedLeg.service.ptMode.ptMode;
      }

      if (timedLeg.service.ptMode.isDemandMode) {
        leadingText = 'OnDemand ' + leadingText;
      }

      let legDurationS = '';
      if (this.legData.leg.legDuration) {
        legDurationS = ' ' + this.legData.leg.legDuration.formatDuration();
      }

      return legIdxS + leadingText + ' - ' + legDurationS;
    }

    return legIdxS + this.legData.leg.legType;
  }

  private computeLegLeadingTextContinousLeg(continuousLeg: OJP_Legacy.TripContinuousLeg): string {
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
    if (!this.legData) {
      return ''
    }

    if (this.legData.leg.legType === 'ContinuousLeg') {
      return 'continous-leg-pill'
    }

    if (this.legData.leg.legType === 'TimedLeg') {
      return 'timed-leg-pill'
    }

    if (this.legData.leg.legType === 'TransferLeg') {
      return 'transfer-leg-pill'
    }

    return ''
  }

  zoomToLeg() {
    if (!this.legData) {
      return
    }

    const tripLegGeoController = new TripLegGeoController(this.legData.leg);

    const legFeatures = tripLegGeoController.computeGeoJSONFeatures();
    const bbox = GeoPositionBBOX.initFromGeoJSONFeatures(legFeatures);

    if (!bbox.isValid()) {
      console.error('Invalid BBOX for leg');
      console.log(this.legData);
      return
    }

    const bounds = new mapboxgl.LngLatBounds(bbox.asFeatureBBOX())
    const mapData = {
      bounds: bounds,
    }
    this.mapService.newMapBoundsRequested.emit(mapData);
  }

  public reloadTripLeg() {
    if (!this.legData) {
      return;
    }

    this.legReloadRequest.emit();
  }

  public get checkboxId() {
    return 'lp_checkbox_' + (this.legData?.leg.legID ?? 'n/a');
  }

  public redrawTripLeg(event: Event) {
    if (!this.legData || (this.legIdx === undefined)) {
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

    if (!this.legData) {
      return defaultColor;
    }

    const legType = this.legData.leg.legType;

    if (legType === 'ContinuousLeg' || legType === 'TransferLeg') {
      const leg = this.legData.leg as OJP_Legacy.TripContinuousLeg;
      return this.computeContinousLegColor(leg);
    }

    if (legType === 'TimedLeg') {
      const leg = this.legData.leg as OJP_Legacy.TripTimedLeg;
      const service = JourneyService.initWithOJP_LegacyJourneyService(leg.service);
      const serviceColorType = service.computeLegColorType();
      const serviceColor = MapLegLineTypeColor[serviceColorType];
      return serviceColor;
    }

    return defaultColor;
  }

  private computeContinousLegColor(leg: OJP_Legacy.TripContinuousLeg): string {
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
    if (this.legData === undefined) {
      return;
    }

    const leg = this.legData.leg;

    this.legInfoDataModel.legColor = this.computeLegColor();
    this.legInfoDataModel.leadingText = this.computeLegLeadingText();

    this.legInfoDataModel.guidanceRows = (() => {
      const rows: GuidanceRow[] = [];

      const isContinous = (leg.legType === 'ContinuousLeg') || (leg.legType === 'TransferLeg');
      if (!isContinous) {
        return rows;
      }

      const guidanceSections = (leg as OJP_Legacy.TripContinuousLeg).pathGuidance?.sections ?? [];
      guidanceSections.forEach(section => {
        if (section.guidanceAdvice === null) {
          return;
        }

        const durationF = (() => {
          const duration = OJP_Legacy.Duration.initFromDurationText(section.trackSection?.duration ?? null);
          if (duration === null) {
            return '';
          }

          const durationF_s1 = duration.formatDuration();
          if (durationF_s1 === '0min') {
            return '';
          }

          return durationF_s1;
        })();

        const geojsonFeature = section.trackSection?.linkProjection?.asGeoJSONFeature() ?? null;

        const row: GuidanceRow = {
          turnDescription: section.turnAction ?? '',
          advice: section.guidanceAdvice ?? '',
          lengthF: OJPHelpers.formatDistance(section.trackSection?.length ?? 0),
          durationF: durationF,
          streetName: section.trackSection?.roadName ?? '',
          geojsonFeature: geojsonFeature,
        };
        rows.push(row);
      });

      return rows;
    })();

    let isWalking = leg.legType === 'TransferLeg'
    const isContinous = leg.legType === 'ContinuousLeg';
    if (isContinous) {
      const continousLeg = leg as OJP_Legacy.TripContinuousLeg;
      isWalking = continousLeg.isWalking();

      if (isWalking) {
        this.legInfoDataModel.distanceText = OJPHelpers.formatDistance(continousLeg.legDistance);
      }
    }
    this.legInfoDataModel.isWalking = isWalking;

    this.legInfoDataModel.legTemplate = (() => {
      const defaultLegTemplate: LegTemplate = 'walk';
      
      if (isContinous) {
        const continousLeg = leg as OJP_Legacy.TripContinuousLeg;
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

      const continousLeg = leg as OJP_Legacy.TripContinuousLeg;
      if (continousLeg.serviceBooking === null) {
        return [];
      }

      return continousLeg.serviceBooking.bookingArrangements;
    })();

    this.legInfoDataModel.durationText = leg.legDuration?.formatDuration() ?? ''

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

      const timedLeg = leg as OJP_Legacy.TripTimedLeg;
      timedLeg.intermediateStopPoints.forEach(stopPoint => {
        const stopPointData = <LegStopPointData>{
          locationText: stopPoint.location.computeLocationName() ?? 'n/a',
        };

        const stopPointCall = OJPHelpers.convertOJP_LegacyStopPoint2StopPointCall(stopPoint);
        OJPHelpers.updateLocationDataWithTime(stopPointData, stopPointCall);

        stopPointsData.push(stopPointData);
      });

      return stopPointsData;
    })();

    this.legInfoDataModel.situations = (() => {
      if (leg.legType !== 'TimedLeg') {
        return [];
      }

      const timedLeg = leg as OJP_Legacy.TripTimedLeg;
      const timedLegSituations = timedLeg.service.siriSituations;
      const situationsData = OJPHelpers.computeSituationsData(this.sanitizer, timedLegSituations);
      
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
      const timedLeg = leg as OJP_Legacy.TripTimedLeg;
      
      const fromLocationVehicleAccessType = OJPHelpers.computePlatformAssistance(timedLeg.fromStopPoint.vehicleAccessType);
      this.legInfoDataModel.fromLocationData.platformAssistanceIconPath = OJPHelpers.computePlatformAssistanceIconPath(fromLocationVehicleAccessType);
      this.legInfoDataModel.fromLocationData.platformAssistanceTooltip = OJPHelpers.computePlatformAssistanceTooltip(fromLocationVehicleAccessType);

      const toLocationVehicleAccessType = OJPHelpers.computePlatformAssistance(timedLeg.toStopPoint.vehicleAccessType);
      this.legInfoDataModel.toLocationData.platformAssistanceIconPath = OJPHelpers.computePlatformAssistanceIconPath(toLocationVehicleAccessType);
      this.legInfoDataModel.toLocationData.platformAssistanceTooltip = OJPHelpers.computePlatformAssistanceTooltip(toLocationVehicleAccessType);

      timedLeg.intermediateStopPoints.forEach((stopPoint, idx) => {
        const locationData = this.legInfoDataModel.intermediaryLocationsData[idx] ?? null;
        if (locationData === null) {
          return;
        }

        const locationVehicleAccessType = OJPHelpers.computePlatformAssistance(stopPoint.vehicleAccessType);
        locationData.platformAssistanceIconPath = OJPHelpers.computePlatformAssistanceIconPath(locationVehicleAccessType);
        locationData.platformAssistanceTooltip = OJPHelpers.computePlatformAssistanceTooltip(locationVehicleAccessType);
      });
    }

    this.legInfoDataModel.serviceAttributes = this.computeServiceAttributeModel(leg);

    this.legInfoDataModel.serviceDestinationText = (() => {
      if (leg.legType !== 'TimedLeg') {
        return null;
      }

      const timedLeg = leg as OJP_Legacy.TripTimedLeg;
      return timedLeg.service.destinationStopPlace?.stopPlaceName ?? 'n/a';
    })();

    this.legInfoDataModel.serviceIntermediaryStopsText = (() => {
      if (leg.legType !== 'TimedLeg') {
        return null;
      }

      const timedLeg = leg as OJP_Legacy.TripTimedLeg;
      const intermediaryStopsNo = timedLeg.intermediateStopPoints.length;
      
      if (intermediaryStopsNo === 0) {
        return null;
      }

      if (intermediaryStopsNo === 1) {
        return '1 stop';
      }

      return intermediaryStopsNo + ' stops';
    })();

    const timedLegService: JourneyService | null = (() => {
      if (leg.legType !== 'TimedLeg') {
        return null;
      }

      const timedLeg = leg as OJP_Legacy.TripTimedLeg;
      const service = JourneyService.initWithOJP_LegacyJourneyService(timedLeg.service);

      return service;
    })();

    this.legInfoDataModel.serviceInfo = timedLegService?.formatServiceName() ?? null;
    this.legInfoDataModel.serviceFormationURL = timedLegService?.computeFormationServiceURL() ?? null;

    this.legInfoDataModel.serviceJourneyRef = (() => {
      if (leg.legType !== 'TimedLeg') {
        return null;
      }

      const timedLeg = leg as OJP_Legacy.TripTimedLeg;

      return timedLeg.service.journeyRef;
    })();

    this.legInfoDataModel.debugServicePtMode = DEBUG_LEVEL === 'DEBUG';
    this.legInfoDataModel.servicePtMode = (() => {
      if (leg.legType !== 'TimedLeg') {
        return null;
      }

      const timedLeg = leg as OJP_Legacy.TripTimedLeg;
      return timedLeg.service.ptMode;
    })();

    this.legInfoDataModel.isCancelled = (() => {
      if (leg.legType !== 'TimedLeg') {
        return false;
      }

      const timedLeg = leg as OJP_Legacy.TripTimedLeg;

      return timedLeg.service.hasCancellation === true;
    })();

    this.legInfoDataModel.hasDeviation = (() => {
      if (leg.legType !== 'TimedLeg') {
        return false;
      }

      const timedLeg = leg as OJP_Legacy.TripTimedLeg;

      return timedLeg.service.hasDeviation === true;
    })();

    this.legInfoDataModel.isUnplanned = (() => {
      if (leg.legType !== 'TimedLeg') {
        return false;
      }

      const timedLeg = leg as OJP_Legacy.TripTimedLeg;

      return timedLeg.service.isUnplanned === true;
    })();
  }

  private computeServiceAttributeModel(leg: OJP_Legacy.TripLeg): ServiceAttributeRenderModel[] {
    const rows: ServiceAttributeRenderModel[] = [];

    if (leg.legType !== 'TimedLeg') {
      return rows;
    } 

    const timedLeg = leg as OJP_Legacy.TripTimedLeg;
    for (const [key, attrData] of Object.entries(timedLeg.service.serviceAttributes)) {
      const icon: string = (() => {
        const defaultIcon = 'kom:circle-question-mark-medium';
        
        if (key === 'A__BA') {
          return defaultIcon;
        }

        if (key === 'A__GF') {
          return 'kom:circle-information-large';
        }

        if (key === 'A__HL') {
          return 'kom:circle-information-large';
        }

        if (key.startsWith('A_')) {
          const code = key.replace(/A_*/, '');
          const standardIcon = 'fpl:sa-' + code.toLowerCase();
          return standardIcon;
        }

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

  private computeLocationData(leg: OJP_Legacy.TripLeg, endpointType: OJP_Legacy.JourneyPointType): LegStopPointData {
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
      const timedLeg = leg as OJP_Legacy.TripTimedLeg
      const stopPoint = isFrom ? timedLeg.fromStopPoint : timedLeg.toStopPoint;

      const stopPointCall = OJPHelpers.convertOJP_LegacyStopPoint2StopPointCall(stopPoint);
      OJPHelpers.updateLocationDataWithTime(stopPointData, stopPointCall);
    }

    return stopPointData
  }

  public zoomToEndpoint(endpointType: OJP_Legacy.JourneyPointType) {
    if (!this.legData) {
      return;
    }

    const isFrom = endpointType === 'From';
    const location = isFrom ? this.legData.leg.fromLocation : this.legData.leg.toLocation;
    if (location.geoPosition) {
      const placeLocation = new PlaceLocation(location.geoPosition.longitude, location.geoPosition.latitude);
      this.mapService.tryToCenterAndZoomToPlace(placeLocation);
    } else {
      console.log('ERROR zoomToEndpoint - no location coords');
      console.log(location);
    }
  }

  public zoomToIntermediaryPoint(idx: number) {
    const newGeoPosition = this.legInfoDataModel.intermediaryLocationsData[idx].geoPosition;
    if (newGeoPosition) {
      const placeLocation = new PlaceLocation(newGeoPosition.longitude, newGeoPosition.latitude);
      this.mapService.tryToCenterAndZoomToPlace(placeLocation);
    } else {
      console.log('ERROR zoomToIntermediaryPoint - no location coords');
      console.log(this.legInfoDataModel.intermediaryLocationsData[idx]);
    }
  }

  public zoomToGuidanceSection(idx: number) {
    const row = this.legInfoDataModel.guidanceRows[idx];

    const feature = row.geojsonFeature;
    if (feature === null) {
      // 1st and last points dont have LegProjection
      // - try to get from the fromLocation / toLocation instead
      // - TODO - even better, save/use the endpoints for the trackSection? 
      //        - because the leg fromLocation / toLocation are not the same as the section
      const legLocation = (() => {
        const isFirst = idx === 0;
        if (isFirst) {
          return this.legData?.leg.fromLocation ?? null;
        }

        const isLast = idx === (this.legInfoDataModel.guidanceRows.length - 1);
        if (isLast) {
          return this.legData?.leg.toLocation ?? null;
        }

        return null;
      })();

      if (legLocation?.geoPosition) {
        const placeLocation = new PlaceLocation(legLocation?.geoPosition.longitude, legLocation?.geoPosition.latitude);
        this.mapService.tryToCenterAndZoomToPlace(placeLocation, 18);
      }
    } else {
      const bbox = feature.bbox ?? null;
      if (bbox) {
        const bounds = new mapboxgl.LngLatBounds(bbox as [number, number, number, number]);

        const dx = bounds.getSouthWest().distanceTo(bounds.getSouthEast());
        const dy = bounds.getNorthWest().distanceTo(bounds.getSouthWest());
        const rectangleDist = Math.max(dx, dy);
        // map zooms out too much for small rectangles, zoom to center instead
        if (rectangleDist < 20) {
          const centerLngLat = bounds.getCenter();
          const placeLocation = new PlaceLocation(centerLngLat.lng, centerLngLat.lat);
          this.mapService.tryToCenterAndZoomToPlace(placeLocation, 18);
        } else {
          const mapData = {
            bounds: bounds,
          }
          this.mapService.newMapBoundsRequested.emit(mapData);
        }
      }
    }
  }

  public loadTripInfoResultPopover() {
    const journeyRef = this.legInfoDataModel.serviceJourneyRef;
    if (journeyRef === null) {
      console.error('loadTripInfoResultPopover: cant fetch empty journeyRef');
      return;
    }

    const dialogRef = this.popover.open(TripInfoResultPopoverComponent, {
      position: { top: '20px' },
      width: '50vw',
      height: '90vh',
      maxWidth: '700px',
    });
    dialogRef.afterOpened().subscribe(() => {
      const popover = dialogRef.componentInstance as TripInfoResultPopoverComponent;
      popover.fetchJourneyRef(journeyRef, this.userTripService.departureDate);
    });
  }

  public loadTRR_Popover() {
    const requestInfo = this.trrRequestInfo ?? null;
    if (requestInfo === null) {
      return;
    }

    const dialogRef = this.popover.open(DebugXmlPopoverComponent, {
      position: { top: '20px' },
      width: '50vw',
      height: '90vh',
    });

    dialogRef.afterOpened().subscribe(() => {
      const popover = dialogRef.componentInstance as DebugXmlPopoverComponent
      popover.updateRequestData(requestInfo);
    });
  }
}
