import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import { SbbExpansionPanel } from '@sbb-esta/angular/accordion';

import * as OJP_Next from 'ojp-sdk-next';
import * as OJP_Types from 'ojp-shared-types';

import { REQUESTOR_REF, OJP_VERSION, FLAG_USE_2nd_SHAPE_PROVIDER } from '../../config/constants';

import { UserTripService } from '../../shared/services/user-trip.service';
import { MapService } from '../../shared/services/map.service';
import { LanguageService } from '../../shared/services/language.service';
import { TripLegGeoController } from '../../shared/controllers/trip-geo-controller';
import { TripData } from '../../shared/types/trip';
import { OJPHelpers } from '../../helpers/ojp-helpers';
import { ShapeProviderService } from '../../shared/services/shape-provider.service';
import { DateHelpers } from '../../helpers/date-helpers';
import { Trip } from '../../shared/models/trip/trip';


interface TripHeaderStats {
  title: string,
  tripChangesInfo: string, 
  tripFromTime: string,
  tripToTime: string,
  tripDurationS: string,
  tripDistanceS: string,

  isCancelled: boolean,
  isInfeasible: boolean,
  isUnplanned: boolean,
}

@Component({
  selector: 'journey-result-row',
  templateUrl: './journey-result-row.component.html',
  styleUrls: ['./journey-result-row.component.scss'],
})
export class JourneyResultRowComponent implements OnInit {
  @Input() tripData: TripData | undefined
  @Input() fareResult: OJP_Types.FareResultSchema | undefined
  @Input() idx: number | undefined

  @ViewChild(SbbExpansionPanel, { static: true }) tripPanel: SbbExpansionPanel | undefined;

  public tripHeaderStats: TripHeaderStats;

  public trrRequestInfo: OJP_Next.RequestInfo | null;

  constructor(private userTripService: UserTripService, private mapService: MapService, private languageService: LanguageService, private shapeProviderService: ShapeProviderService, private sanitizer: DomSanitizer) {
    this.tripHeaderStats = <TripHeaderStats>{};
    this.trrRequestInfo = null;
  }

  async ngOnInit() {
    if (!this.tripData) {
      return;
    }

    this.updateTripModel(this.tripData);

    const isFirstTrip = this.idx === 0;
    if (this.tripPanel && isFirstTrip) {
      this.tripPanel.open();
    }

    this.tripPanel?.afterExpand.subscribe(async ev => {
      this.drawAndZoomToMapTrip();
      await this.loadShapeProvider();
    });
    if (isFirstTrip) {
      this.drawAndZoomToMapTrip();
      await this.loadShapeProvider();
    }
  }

  private updateTripModel(tripData: TripData) {
     this.initTripHeaderStats(tripData.trip);

    tripData.legsData.forEach(legData => {
      const showPreciseLine: boolean = (() => {
        if (FLAG_USE_2nd_SHAPE_PROVIDER) {
          return true;
        }
        
        return !TripLegGeoController.shouldUseBeeline(legData.leg);
      })();

      legData.map = {
        show: true,
        showPreciseLine: showPreciseLine,
        showOtherProvider: false,
        legShapeResult: null,
        legShapeError: null,
      };
    });
  }

  private async loadShapeProvider() {
    if (!this.tripData) {
      return;
    }

    if (!FLAG_USE_2nd_SHAPE_PROVIDER) {
      return;
    }

    for (const legData of this.tripData.legsData) {
      try {
        const legShapeResult = await this.shapeProviderService.fetchLegShape(legData.leg);
        legData.map.legShapeResult = legShapeResult;
        if (legShapeResult.source === 'fetch') {
          await DateHelpers.sleep(200);
        }
      } catch (error) {
        legData.map.legShapeError = (error as Error).message;
      }
    }
  }

  private drawAndZoomToMapTrip(zoomToTrip: boolean = true) {
    if (!this.tripData) {
      return;
    }

    this.userTripService.mapActiveTripSelected.emit(this.tripData);
    if (zoomToTrip) {
      this.mapService.zoomToTrip(this.tripData.trip);
    }
  }

  private initTripHeaderStats(trip: Trip) {
    this.tripHeaderStats.title = 'Trip ' + ((this.idx ?? 0) + 1);

    this.tripHeaderStats.isCancelled = trip.realTimeData.cancelled === true;
    this.tripHeaderStats.isInfeasible = trip.realTimeData.infeasible === true;
    this.tripHeaderStats.isUnplanned = trip.realTimeData.unplanned === true;
      
    if (trip.transfers === 0) {
      this.tripHeaderStats.tripChangesInfo = 'direct';
    } else if (trip.transfers === 1) {
      this.tripHeaderStats.tripChangesInfo = '1 transfer';
    } else {
      this.tripHeaderStats.tripChangesInfo = trip.transfers + ' transfers';
    }

    this.tripHeaderStats.tripFromTime = OJP_Next.DateHelpers.formatTimeHHMM(trip.startDateTime);
    
    this.tripHeaderStats.tripToTime = OJP_Next.DateHelpers.formatTimeHHMM(trip.endDateTime);
    const dayDiff = JourneyResultRowComponent.getDayOffset(trip.startDateTime, trip.endDateTime);
    if(dayDiff > 0){
      this.tripHeaderStats.tripToTime = '(+' + dayDiff + 'd) ' + this.tripHeaderStats.tripToTime;
    }

    this.tripHeaderStats.tripDurationS = trip.duration.format();

    this.tripHeaderStats.tripDistanceS = (() => {
      const sourceF = trip.distance.source === '1a.trip.distance' ? 'Δ' : 'Σ';
      const distanceF = OJPHelpers.formatDistance(trip.distance.distanceM ?? 0);

      return distanceF + ' ' + sourceF;
    })();
  }

  private static getDayOffset(start: Date, end: Date){
    return Math.ceil(
      Math.abs(
        new Date(Date.UTC(
          end.getUTCFullYear(),
          end.getUTCMonth(),
          end.getUTCDate()
        )).valueOf() -
        new Date(Date.UTC(
          start.getUTCFullYear(),
          start.getUTCMonth(),
          start.getUTCDate()
        )).valueOf()
      ) / (1000 * 3600 * 24)
    )
  }

  public async reloadTripLegIdx() {
    if (!this.tripData) {
      return;
    }

    const trip = this.tripData.trip;
    const tripSchema = trip.asOJP_Schema();

    // strip-out unecessary nodes
    tripSchema.leg.forEach(legSchema => {
      if (legSchema.continuousLeg?.legTrack) {
        delete(legSchema.continuousLeg?.legTrack);
        delete(legSchema.continuousLeg?.pathGuidance);
      }
      if (legSchema.timedLeg) {
        delete(legSchema.timedLeg?.legTrack);
        
        legSchema.timedLeg.legBoard.expectedDepartureOccupancy = [];
        legSchema.timedLeg.legIntermediate.forEach(el => el.expectedDepartureOccupancy = []);
        legSchema.timedLeg.legAlight.expectedDepartureOccupancy = [];
      }
    });

    const stageConfig = this.userTripService.getStageConfig();
    const ojpSDK_Next = OJP_Next.SDK.create(REQUESTOR_REF, stageConfig, this.languageService.language);
    const trrRequest = ojpSDK_Next.requests.TripRefineRequest.initWithTrip(tripSchema);

    const trrResponse = await trrRequest.fetchResponse(ojpSDK_Next);
    if (!trrResponse.ok) {
      console.error('ERROR - fetchTripRefineRequestResponse');
      console.log(trrRequest);
      console.log(trrResponse);
      debugger;
      return;
    }

    if (trrRequest.requestInfo.responseXML === null) {
      console.error('no responseXML');
      console.log(trrRequest);
      debugger;
      return;
    }

    if (trrResponse.value.tripResult.length !== 1) {
      console.error('Expected 1 trip in reponse');
      console.log(trrResponse);
      return;
    }

    this.trrRequestInfo = trrRequest.requestInfo;

    const mapPlaces = OJPHelpers.parseAnyPlaceContext(OJP_VERSION, trrResponse.value.tripResponseContext);
    const mapSituations = OJPHelpers.parseAnySituationsContext(this.sanitizer, OJP_VERSION, trrResponse.value.tripResponseContext);
    
    const updatedTrip = Trip.initWithTripResultSchema(OJP_VERSION, trrResponse.value.tripResult[0], mapPlaces, mapSituations);
    if (!updatedTrip) {
      console.error('cant decode trip');
      console.log(trrResponse);
      return;
    }

    const fareResults = await this.userTripService.fetchFaresForTrips(this.languageService.language, [updatedTrip]);
    if (fareResults.length === 1) {
      this.fareResult = fareResults[0];
    } else {
      // if curreny NOVA fails, rely on older version of fares
      console.log('error: nova failed to return new fares, use old ones');
    }

    const newTripsData = OJPHelpers.convertTripsToTripData([updatedTrip]);
    this.tripData = newTripsData[0];

    this.updateTripModel(this.tripData);

    const zoomToTrip = false;
    this.drawAndZoomToMapTrip(zoomToTrip);
    await this.loadShapeProvider();
  }

  public redrawTripOnMap() {
    if (!this.tripData) {
      return;
    }

    this.userTripService.mapActiveTripSelected.emit(this.tripData);
  }
}
