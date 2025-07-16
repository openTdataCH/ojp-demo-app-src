import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { SbbExpansionPanel } from '@sbb-esta/angular/accordion';

import OJP_Legacy from '../../config/ojp-legacy';
import * as OJP_Next from 'ojp-sdk-next';

import { DEBUG_LEVEL, REQUESTOR_REF, OJP_VERSION } from '../../config/constants';

import { UserTripService } from '../../shared/services/user-trip.service';
import { MapService } from '../../shared/services/map.service';
import { LanguageService } from '../../shared/services/language.service';
import { MapTrip, MapTripLeg } from '../../shared/types/map-geometry-types';
import { TripLegGeoController } from '../../shared/controllers/trip-geo-controller';
import { TripData } from '../../shared/types/trip';
import { OJPHelpers } from '../../helpers/ojp-helpers';

interface TripHeaderStats {
  title: string,
  tripChangesInfo: string, 
  tripFromTime: string,
  tripToTime: string,
  tripDurationS: string,
  tripDistanceS: string,

  isCancelled: boolean,
  isInfeasable: boolean,
  isUnplanned: boolean,
}

@Component({
  selector: 'journey-result-row',
  templateUrl: './journey-result-row.component.html',
  styleUrls: ['./journey-result-row.component.scss'],
})
export class JourneyResultRowComponent implements OnInit {
  @Input() tripData: TripData | undefined
  @Input() idx: number | undefined

  @ViewChild(SbbExpansionPanel, { static: true }) tripPanel: SbbExpansionPanel | undefined;

  public tripHeaderStats: TripHeaderStats;

  public mapTrip: MapTrip | null;
  public trrRequestInfo: OJP_Next.RequestInfo | null;

  constructor(private userTripService: UserTripService, private mapService: MapService, private languageService: LanguageService) {
    this.tripHeaderStats = <TripHeaderStats>{}
    this.mapTrip = null;
    this.trrRequestInfo = null;
  }

  ngOnInit() {
    if (!this.tripData) {
      return;
    }

    this.initTripHeaderStats(this.tripData.trip);

    this.mapTrip = {
      legs: [],
    };

    this.tripData.legsData.forEach(legData => {
      const forceLinkProjection = !TripLegGeoController.shouldUseBeeline(legData.leg);

      const mapTripLeg: MapTripLeg = {
        leg: legData.leg,
        forceLinkProjection: forceLinkProjection,
      };
      this.mapTrip?.legs.push(mapTripLeg);
    });

    const isFirstTrip = this.idx === 0;
    if (this.tripPanel && isFirstTrip) {
      this.tripPanel.open();
    }

    this.tripPanel?.afterExpand.subscribe(ev => {
      this.drawAndZoomToMapTrip();
    });
    if (isFirstTrip) {
      this.drawAndZoomToMapTrip();
    }
  }

  private drawAndZoomToMapTrip() {
    if (!this.tripData) {
      return;
    }

    this.userTripService.selectActiveTrip(this.mapTrip);
    this.mapService.zoomToTrip(this.tripData.trip);
  }

  private initTripHeaderStats(trip: OJP_Legacy.Trip) {
    this.tripHeaderStats.title = 'Trip ' + ((this.idx ?? 0) + 1);

    this.tripHeaderStats.isCancelled = trip.stats.isCancelled === true;
    this.tripHeaderStats.isInfeasable = trip.stats.isInfeasable === true;
    this.tripHeaderStats.isUnplanned = trip.stats.isUnplanned === true;
      
    if (trip.stats.transferNo === 0) {
      this.tripHeaderStats.tripChangesInfo = 'direct';
    } else if (trip.stats.transferNo === 1) {
      this.tripHeaderStats.tripChangesInfo = trip.stats.transferNo + ' transfer';
    } else {
      this.tripHeaderStats.tripChangesInfo = trip.stats.transferNo + ' transfers';
    }

    this.tripHeaderStats.tripFromTime = OJP_Legacy.DateHelpers.formatTimeHHMM(trip.stats.startDatetime);
    
    this.tripHeaderStats.tripToTime = OJP_Legacy.DateHelpers.formatTimeHHMM(trip.stats.endDatetime);
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
    const xmlConfig = isOJPv2 ? OJP_Legacy.XML_ConfigOJPv2 : OJP_Legacy.XML_BuilderConfigOJPv1;

    const tripXML = this.tripData.trip.asXML(xmlConfig);
    // console.log(tripXML);

    // TODO - when migrating this code to next version we dont need to serialize/deserialize the obj anymore
    const tripV2 = OJP_Next.Trip.initWithTripXML(tripXML);

    // HACK - keep for now only timedLegs
    tripV2.leg = tripV2.leg.filter(el => (el.timedLeg || el.transferLeg));

    const trrRequest = OJP_Next.TripRefineRequest.initWithTrip(tripV2);

    const stage = this.userTripService.getStageConfig();

    const ojpSDK_Next = new OJP_Next.SDK(REQUESTOR_REF, stage, this.languageService.language);
    const trrResponse = await ojpSDK_Next.fetchTripRefineRequestResponse(trrRequest);
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
      this.tripData.fareResult = fareResults[0];
    } else {
      // if curreny NOVA fails, rely on older version of fares
      console.log('error: nova failed to return new fares, use old ones');
    }

    this.tripData.trip = updatedTrip;
  }

  public redrawTripOnMap(legData: { legIdx: number, checked: boolean }) {
    if (!this.mapTrip) {
      return;
    }

    this.mapTrip.legs[legData.legIdx].forceLinkProjection = legData.checked;
    this.userTripService.selectActiveTrip(this.mapTrip);
  }
}
