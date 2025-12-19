import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { SbbExpansionPanel } from '@sbb-esta/angular/accordion';

import * as OJP_Next from 'ojp-sdk-next';
import * as OJP_Types from 'ojp-shared-types';

import OJP_Legacy from '../../config/ojp-legacy';

import { DEBUG_LEVEL, REQUESTOR_REF, OJP_VERSION, FLAG_USE_2nd_SHAPE_PROVIDER } from '../../config/constants';

import { UserTripService } from '../../shared/services/user-trip.service';
import { MapService } from '../../shared/services/map.service';
import { LanguageService } from '../../shared/services/language.service';
import { TripLegGeoController } from '../../shared/controllers/trip-geo-controller';
import { TripData, TripLegData } from '../../shared/types/trip';
import { OJPHelpers } from '../../helpers/ojp-helpers';
import { ShapeProviderService } from '../../shared/services/shape-provider.service';
import { DateHelpers } from '../../helpers/date-helpers';

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

  constructor(private userTripService: UserTripService, private mapService: MapService, private languageService: LanguageService, private shapeProviderService: ShapeProviderService) {
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

  private initTripHeaderStats(trip: OJP_Legacy.Trip) {
    this.tripHeaderStats.title = 'Trip ' + ((this.idx ?? 0) + 1);

    this.tripHeaderStats.isCancelled = trip.stats.isCancelled === true;
    this.tripHeaderStats.isInfeasible = trip.stats.isInfeasible === true;
    this.tripHeaderStats.isUnplanned = trip.stats.isUnplanned === true;
      
    if (trip.stats.transferNo === 0) {
      this.tripHeaderStats.tripChangesInfo = 'direct';
    } else if (trip.stats.transferNo === 1) {
      this.tripHeaderStats.tripChangesInfo = trip.stats.transferNo + ' transfer';
    } else {
      this.tripHeaderStats.tripChangesInfo = trip.stats.transferNo + ' transfers';
    }

    this.tripHeaderStats.tripFromTime = OJP_Next.DateHelpers.formatTimeHHMM(trip.stats.startDatetime);
    
    this.tripHeaderStats.tripToTime = OJP_Next.DateHelpers.formatTimeHHMM(trip.stats.endDatetime);
    const dayDiff = JourneyResultRowComponent.getDayOffset(trip.stats.endDatetime, trip.stats.startDatetime);
    if(dayDiff > 0){
      this.tripHeaderStats.tripToTime = '(+' + dayDiff + 'd) ' + this.tripHeaderStats.tripToTime;
    }

    this.tripHeaderStats.tripDurationS = trip.stats.duration.formatDuration()

    this.tripHeaderStats.tripDistanceS = (() => {
      if (DEBUG_LEVEL !== 'DEBUG') {
        return OJPHelpers.formatDistance(trip.stats.distanceMeters);
      }

      const sourceF = trip.stats.distanceSource === 'trip' ? 'Δ' : 'Σ';
      const distanceF = OJPHelpers.formatDistance(trip.stats.distanceMeters);

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

    const isOJPv2 = OJP_VERSION === '2.0';
    const xmlConfig = isOJPv2 ? OJP_Next.DefaultXML_Config : OJP_Next.XML_BuilderConfigOJPv1;

    const tripXML = this.tripData.trip.asXML(xmlConfig);
    // console.log(tripXML);

    // TODO - when migrating this code to next version we dont need to serialize/deserialize the obj anymore
    const tripV2 = OJP_Next.Trip.initWithTripXML(tripXML);

    // HACK - keep for now only timedLegs
    tripV2.leg = tripV2.leg.filter(el => (el.timedLeg || el.transferLeg));

    const stageConfig = this.userTripService.getStageConfig();
    const ojpSDK_Next = OJP_Next.SDK.create(REQUESTOR_REF, stageConfig, this.languageService.language);
    const trrRequest = ojpSDK_Next.requests.TripRefineRequest.initWithTrip(tripV2);
    
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

    this.trrRequestInfo = trrRequest.requestInfo;

    // TRR response is similar with TR response
    const trRequest = OJP_Legacy.TripRequest.initWithResponseMock(trrRequest.requestInfo.responseXML, xmlConfig, REQUESTOR_REF);
    
    const trResponse = await trRequest.fetchResponse();

    if (trResponse.trips.length !== 1) {
      console.error('Expected 1 trip in reponse');
      console.log(trResponse);
      return;
    }
    
    const updatedTrip = trResponse.trips[0];

    const fareResults = await this.userTripService.fetchFaresForTrips(this.languageService.language, [updatedTrip]);
    if (fareResults.length === 1) {
      this.fareResult = fareResults[0];
    } else {
      // if curreny NOVA fails, rely on older version of fares
      console.log('error: nova failed to return new fares, use old ones');
    }

    this.tripData.trip = updatedTrip;
    
    const tripData = this.tripData;
    if (this.tripData) {
      const newLegsData: TripLegData[] = [];
      tripData.legsData.forEach((legData, idx) => {
        const newLegData: TripLegData = {
          tripId: tripData.trip.id,
          leg: updatedTrip.legs[idx],
          info: legData.info,
          map: legData.map,
        };
        newLegsData.push(newLegData);
      });

      this.tripData.legsData = newLegsData;
    }
  }

  public redrawTripOnMap() {
    if (!this.tripData) {
      return;
    }

    this.userTripService.mapActiveTripSelected.emit(this.tripData);
  }
}
