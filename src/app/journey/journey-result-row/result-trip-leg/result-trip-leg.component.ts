import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';

import mapboxgl from 'mapbox-gl';

import { SbbDialog } from "@sbb-esta/angular/dialog";

import * as OJP_Types from 'ojp-shared-types';
import * as OJP_Next from 'ojp-sdk-next';

import { DEBUG_LEVEL, FLAG_USE_2nd_SHAPE_PROVIDER, OJP_VERSION } from '../../../config/constants';

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
import { BookingArrangement, JourneyPointType } from '../../../shared/types/_all';
import { ContinuousLeg } from '../../../shared/models/trip/leg/continuous-leg';
import { TimedLeg } from '../../../shared/models/trip/leg/timed-leg';
import { AnyLeg } from '../../../shared/models/trip/leg-builder';
import { StopPointHelpers } from '../../../shared/models/stop-point-call';
import { TransferLeg } from '../../../shared/models/trip/leg/transfer-leg';

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
  bookingArrangements: BookingArrangement[],
  
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
  servicePtMode: OJP_Types.ModeStructureSchema | null,
  servicePtSubMode: Record<string, string>,
  serviceFormationURL: string | null,

  isCancelled: boolean,
  hasDeviation: boolean,
  isUnplanned: boolean,

  gui: {
    showLineLabelId: string,
    showPreciseLineLabelId: string,
    showLinkProjectionToggle: boolean,
    
    useOtherProvider: boolean,
    showOtherProviderLineLabelId: string,
  }
};

@Component({
  selector: 'result-trip-leg',
  templateUrl: './result-trip-leg.component.html',
  styleUrls: ['./result-trip-leg.component.scss']
})
export class ResultTripLegComponent implements OnInit {
  @Input() legData: TripLegData | undefined;
  @Input() trrRequestInfo: OJP_Next.RequestInfo | undefined;

  @Output() legReloadRequest = new EventEmitter<void>();
  @Output() legMapRedrawRequest = new EventEmitter<void>();

  public legElementId: string = 'n/a';

  public legInfoDataModel: LegInfoDataModel;

  public isEmbed: boolean;

  public enableTRR: boolean;

  constructor(
    private mapService: MapService, 
    private router: Router, 
    private popover: SbbDialog, 
    private userTripService: UserTripService
  ) {
    this.legInfoDataModel = <LegInfoDataModel>{};
    this.isEmbed = this.router.url.indexOf('/embed/') !== -1;

    const isOJPv2 = OJP_VERSION === '2.0';
    this.enableTRR = isOJPv2;
  }

  async ngOnInit() {
    if (this.legData === undefined) {
      return;
    }

    this.legElementId = 'leg_' + this.legData.leg.id;
    this.initLegInfo();
  }
  
  private computeLegLeadingText(): string {
    if (this.legData === undefined) {
      return 'n/a';
    }

    const legIdxS = '' + (this.legData.info.id) + '. ';

    if (this.legData.leg.type === 'TransferLeg') {
      const leadingTextTitle = 'Transfer';
      
      const transferLeg = this.legData.leg as TransferLeg;
      let legDurationS = '';
      if (transferLeg.duration) {
        legDurationS = ' - ' + transferLeg.duration.format();
      }
      
      return legIdxS + leadingTextTitle + legDurationS;
    }

    if (this.legData.leg.type === 'ContinuousLeg') {
      const continuousLeg = this.legData.leg as ContinuousLeg;

      const leadingText = this.computeLegLeadingTextContinousLeg(continuousLeg);

      let legDurationS = '';
      if (this.legData.leg.duration) {
        legDurationS = ' ' + this.legData.leg.duration.format();
      }
      
      return legIdxS + leadingText + ' - ' + legDurationS;
    }

    if (this.legData.leg.type === 'TimedLeg') {
      const timedLeg = this.legData.leg as TimedLeg;

      let leadingText = timedLeg.service.mode.name?.text ?? null;
      if (leadingText === null) {
        leadingText = timedLeg.service.mode.ptMode;
      }

      if (timedLeg.service.ptMode.isDemandMode) {
        leadingText = 'OnDemand ' + leadingText;
      }

      let legDurationS = '';
      if (this.legData.leg.duration) {
        legDurationS = ' ' + this.legData.leg.duration.format();
      }

      return legIdxS + leadingText + ' - ' + legDurationS;
    }

    return legIdxS + this.legData.leg.type;
  }

  private computeSubMode(mode: OJP_Types.ModeStructureSchema): Record<string, string> {
    const subModeKeys = ['air', 'bus', 'coach', 'funicular', 'metro', 'tram', 'telecabin', 'rail', 'water'];
    
    const mapSubMode: Record<string, string> = {};
    subModeKeys.forEach(subModeKey => {
      const subModeValue = (mode as Record<string, any>)[subModeKey + 'Submode'] ?? null;
      if (subModeValue !== null) {
        mapSubMode[subModeKey + 'Submode'] = subModeValue;
      } 
    });
    
    return mapSubMode;
  }

  private computeLegLeadingTextContinousLeg(continuousLeg: ContinuousLeg): string {
    if (continuousLeg.service.personalMode === 'foot') {
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

    if (this.legData.leg.type === 'ContinuousLeg') {
      return 'continous-leg-pill'
    }

    if (this.legData.leg.type === 'TimedLeg') {
      return 'timed-leg-pill'
    }

    if (this.legData.leg.type === 'TransferLeg') {
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

  private redrawTripLeg() {
    this.legMapRedrawRequest.emit();
  }

  public onClickShowMapLeg(checked: boolean) {
    if (this.legData?.map) {
      this.legData.map.show = checked;
    }

    this.redrawTripLeg();
  }

  public onClickShowPreciseMapLeg(checked: boolean) {
    if (this.legData?.map) {
      this.legData.map.showPreciseLine = checked;
    }

    this.redrawTripLeg();
  }

  public onClickShowOtherProviderMapLeg(checked: boolean) {
    if (this.legData?.map) {
      this.legData.map.showOtherProvider = checked;
    }

    this.redrawTripLeg();
  }

  private computeLegColor(): string {
    const defaultColor = MapLegLineTypeColor.Unknown;

    if (!this.legData) {
      return defaultColor;
    }

    const legType = this.legData.leg.type;

    if (legType === 'ContinuousLeg') {
      const leg = this.legData.leg as ContinuousLeg;
      return this.computeContinousLegColor(leg);
    }

    if (legType === 'TransferLeg') {
      return MapLegLineTypeColor['Transfer'];
    }

    if (legType === 'TimedLeg') {
      const leg = this.legData.leg as TimedLeg;
      const serviceColorType = leg.service.computeLegColorType();
      const serviceColor = MapLegLineTypeColor[serviceColorType];
      return serviceColor;
    }

    return defaultColor;
  }

  private computeContinousLegColor(leg: ContinuousLeg): string {
    if (leg.isDriveCarLeg()) {
      return MapLegLineTypeColor['Self-Drive Car'];
    }

    if (leg.isSharedMobility()) {
      return MapLegLineTypeColor['Shared Mobility'];
    }

    if (leg.type === 'TransferLeg') {
      return MapLegLineTypeColor.Transfer;
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

      const isContinous = (leg.type === 'ContinuousLeg') || (leg.type === 'TransferLeg');
      if (!isContinous) {
        return rows;
      }

      const guidanceSections = (leg as ContinuousLeg).pathGuidance?.sections ?? [];
      guidanceSections.forEach(section => {
        if (section.guidanceAdvice === null) {
          return;
        }

        const durationF = (() => {
          const duration = section.trackSection.duration;
          if (duration === null) {
            return '';
          }

          const durationF_s1 = duration.format();
          if (durationF_s1 === '0min') {
            return '';
          }

          return durationF_s1;
        })();

        const geojsonFeature = section.trackSection.linkProjection?.asGeoJSONFeature() ?? null;

        const row: GuidanceRow = {
          turnDescription: section.turnDescription ?? '',
          advice: section.guidanceAdvice ?? '',
          lengthF: OJPHelpers.formatDistance(section.trackSection.distance?.distanceM ?? 0),
          durationF: durationF,
          streetName: section.roadName ?? '',
          geojsonFeature: geojsonFeature,
        };
        rows.push(row);
      });

      return rows;
    })();

    const isContinous = leg.type === 'ContinuousLeg';
    this.legInfoDataModel.isWalking = (() => {
      const isTransfer = leg.type === 'TransferLeg';
      if (isTransfer) {
        return true;
      }

      if (isContinous) {
        const continousLeg = leg as ContinuousLeg;
        return continousLeg.isWalking();
      }

      return false;
    })();

    this.legInfoDataModel.distanceText = (() => {
      if (leg.type === 'TimedLeg') {
        return '';
      }

      if (leg.distance.distanceM === 0) {
        return '';
      }
      
      // No need to format, use 'Δ' : 'Σ' because the distance is always computed
      // const sourceF = leg.distance.source === '1a.trip.distance' ? 'Δ' : 'Σ';
      // const distanceF = OJPHelpers.formatDistance(leg.distance.distanceM ?? 0);
      // const distanceS = distanceF + ' ' + sourceF + '';

      const distanceS = OJPHelpers.formatDistance(leg.distance.distanceM);
      return distanceS;
    })();

    this.legInfoDataModel.legTemplate = (() => {
      const defaultLegTemplate: LegTemplate = 'walk';
      
      if (isContinous) {
        const continousLeg = leg as ContinuousLeg;
        if (continousLeg.isTaxi()) {
          return 'taxi';
        }
      }

      if (leg.type === 'TimedLeg') {
        return 'timed';
      }
      
      return defaultLegTemplate;
    })();

    this.legInfoDataModel.bookingArrangements = (() => {
      if (!isContinous) {
        return [];
      }


      return continousLeg.serviceBooking.bookingArrangements;
    })();

    this.legInfoDataModel.durationText = leg.duration?.format() ?? ''

    const legIconFilename = OJPHelpers.computeIconFilenameForLeg(leg);
    this.legInfoDataModel.legIconPath = 'assets/pictograms/' + legIconFilename + '.png';

    this.legInfoDataModel.isTimed = leg.type === 'TimedLeg';
    
    this.legInfoDataModel.fromLocationData = this.computeLocationData(leg, 'From');
    this.legInfoDataModel.toLocationData = this.computeLocationData(leg, 'To');

    this.legInfoDataModel.intermediaryLocationsData = (() => {
      const stopPointsData: LegStopPointData[] = [];

      if (leg.type !== 'TimedLeg') {
        return stopPointsData;
      }

      const timedLeg = leg as TimedLeg;
      timedLeg.intermediateStopCalls.forEach(stopCall => {
        const stopPointData = <LegStopPointData>{
          locationText: stopCall.place?.computeName() ?? 'n/a',
        };

        StopPointHelpers.updateLocationDataWithTime(stopPointData, stopCall);

        stopPointsData.push(stopPointData);
      });

      return stopPointsData;
    })();

    this.legInfoDataModel.situations = (() => {
      if (leg.type !== 'TimedLeg') {
        return [];
      }

      const timedLeg = leg as TimedLeg;
      return timedLeg.situationsContent;
    })();
    this.legInfoDataModel.hasSituations = this.legInfoDataModel.situations.length > 0;

    if (leg.type === 'TimedLeg') {
      const timedLeg = leg as TimedLeg;
      
      const fromLocationVehicleAccessType = StopPointHelpers.computePlatformAssistance(timedLeg.fromStopCall.vehicleAccessType);
      this.legInfoDataModel.fromLocationData.platformAssistanceIconPath = StopPointHelpers.computePlatformAssistanceIconPath(fromLocationVehicleAccessType);
      this.legInfoDataModel.fromLocationData.platformAssistanceTooltip = StopPointHelpers.computePlatformAssistanceTooltip(fromLocationVehicleAccessType);

      const toLocationVehicleAccessType = StopPointHelpers.computePlatformAssistance(timedLeg.toStopCall.vehicleAccessType);
      this.legInfoDataModel.toLocationData.platformAssistanceIconPath = StopPointHelpers.computePlatformAssistanceIconPath(toLocationVehicleAccessType);
      this.legInfoDataModel.toLocationData.platformAssistanceTooltip = StopPointHelpers.computePlatformAssistanceTooltip(toLocationVehicleAccessType);

      timedLeg.intermediateStopCalls.forEach((stopPoint, idx) => {
        const locationData = this.legInfoDataModel.intermediaryLocationsData[idx] ?? null;
        if (locationData === null) {
          return;
        }

        const locationVehicleAccessType = StopPointHelpers.computePlatformAssistance(stopPoint.vehicleAccessType);
        locationData.platformAssistanceIconPath = StopPointHelpers.computePlatformAssistanceIconPath(locationVehicleAccessType);
        locationData.platformAssistanceTooltip = StopPointHelpers.computePlatformAssistanceTooltip(locationVehicleAccessType);
      });
    }

    this.legInfoDataModel.serviceAttributes = this.computeServiceAttributeModel(leg);

    this.legInfoDataModel.serviceDestinationText = (() => {
      if (leg.type !== 'TimedLeg') {
        return null;
      }

      const timedLeg = leg as TimedLeg;
      return timedLeg.service.destinationText?.text ?? 'n/a';
    })();

    this.legInfoDataModel.serviceIntermediaryStopsText = (() => {
      if (leg.type !== 'TimedLeg') {
        return null;
      }

      const timedLeg = leg as TimedLeg;
      const intermediaryStopsNo = timedLeg.intermediateStopCalls.length;
      
      if (intermediaryStopsNo === 0) {
        return null;
      }

      if (intermediaryStopsNo === 1) {
        return '1 stop';
      }

      return intermediaryStopsNo + ' stops';
    })();

    const timedLegService: JourneyService | null = (() => {
      if (leg.type !== 'TimedLeg') {
        return null;
      }

      const timedLeg = leg as TimedLeg;
      
      return timedLeg.service;
    })();

    this.legInfoDataModel.serviceInfo = timedLegService?.formatServiceName() ?? null;
    this.legInfoDataModel.serviceFormationURL = timedLegService?.computeFormationServiceURL() ?? null;

    this.legInfoDataModel.serviceJourneyRef = (() => {
      if (leg.type !== 'TimedLeg') {
        return null;
      }

      const timedLeg = leg as TimedLeg;

      return timedLeg.service.journeyRef;
    })();

    this.legInfoDataModel.debugServicePtMode = DEBUG_LEVEL === 'DEBUG';
    this.legInfoDataModel.servicePtMode = (() => {
      if (leg.type !== 'TimedLeg') {
        return null;
      }

      const timedLeg = leg as TimedLeg;
      return timedLeg.service.mode;
    })();
    this.legInfoDataModel.servicePtSubMode = (() => {
      if (leg.type !== 'TimedLeg') {
        return {};
      }

      const timedLeg = leg as TimedLeg;
      const subMode = this.computeSubMode(timedLeg.service.mode);
      return subMode;
    })();

    this.legInfoDataModel.isCancelled = (() => {
      if (leg.type !== 'TimedLeg') {
        return false;
      }

      const timedLeg = leg as TimedLeg;

      return timedLeg.service.cancelled === true;
    })();

    this.legInfoDataModel.hasDeviation = (() => {
      if (leg.type !== 'TimedLeg') {
        return false;
      }

      const timedLeg = leg as TimedLeg;

      return timedLeg.service.deviation === true;
    })();

    this.legInfoDataModel.isUnplanned = (() => {
      if (leg.type !== 'TimedLeg') {
        return false;
      }

      const timedLeg = leg as TimedLeg;

      return timedLeg.service.unplanned === true;
    })();

    const legIdKey = this.legData.tripId + '_' + this.legData.leg.id;
    this.legInfoDataModel.gui = {
      showLineLabelId: 'show_line_' + legIdKey,
      showPreciseLineLabelId: 'show_precise_line_' + legIdKey,
      showLinkProjectionToggle: !FLAG_USE_2nd_SHAPE_PROVIDER,

      useOtherProvider: FLAG_USE_2nd_SHAPE_PROVIDER,
      showOtherProviderLineLabelId: 'show_provider2_line_' + legIdKey,
    };
  }

  private computeServiceAttributeModel(leg: AnyLeg): ServiceAttributeRenderModel[] {
    const rows: ServiceAttributeRenderModel[] = [];

    if (leg.type !== 'TimedLeg') {
      return [];
    } 

    const timedLeg = leg as TimedLeg;
    timedLeg.service.attribute.forEach(serviceAttribute => {
      const key = serviceAttribute.code;
      const icon: string = (() => {
        const defaultIcon = 'kom:circle-question-mark-medium';
        
        if (key === 'A__BA') {
          return defaultIcon;
        }

        if (['A__GF', 'A__HL', 'A__BU'].includes(key)) {
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
        return;
      }

      const rowData: ServiceAttributeRenderModel = {
        icon: icon,
        caption: serviceAttribute.userText.text,
      };
      rows.push(rowData);
    });

    return rows;
  }

  private computeLocationData(leg: AnyLeg, endpointType: JourneyPointType): LegStopPointData {
    const isFrom = endpointType === 'From';

    const place = isFrom ? leg.fromPlace : leg.toPlace;

    const stopPointData = <LegStopPointData>{
      locationText: place?.computeName() ?? null,
      platformText: null,
      arrText: null,
      arrDelayText: null,
      depText: null,
      depDelayText: null,
    };

    if (leg.type === 'TimedLeg') {
      const timedLeg = leg as TimedLeg
      const stopPointCall = isFrom ? timedLeg.fromStopCall : timedLeg.toStopCall;
      StopPointHelpers.updateLocationDataWithTime(stopPointData, stopPointCall);
    }

    return stopPointData
  }

  public zoomToEndpoint(endpointType: JourneyPointType) {
    if (!this.legData) {
      return;
    }

    const isFrom = endpointType === 'From';
    const place = isFrom ? this.legData.leg.fromPlace : this.legData.leg.toPlace;
    if (place?.geoPosition) {
      this.mapService.tryToCenterAndZoomToPlace(place);
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
          return this.legData?.leg.fromPlace ?? null;
        }

        const isLast = idx === (this.legInfoDataModel.guidanceRows.length - 1);
        if (isLast) {
          return this.legData?.leg.toPlace ?? null;
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
