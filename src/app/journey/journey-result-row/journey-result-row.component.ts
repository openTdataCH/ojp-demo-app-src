import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { SbbExpansionPanel } from '@sbb-esta/angular/accordion';

import * as OJP from 'ojp-sdk-v2';
import * as OJP_Next from 'ojp-sdk-next';

import { DEBUG_LEVEL, REQUESTOR_REF } from '../../config/constants';
import { UserTripService } from '../../shared/services/user-trip.service';
import { MapService } from '../../shared/services/map.service';
import { LanguageService } from '../../shared/services/language.service';
import { MapTrip, MapTripLeg } from '../../shared/types/map-geometry-types';
import { TripLegGeoController } from '../../shared/controllers/trip-geo-controller';

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
  @Input() trip: OJP.Trip | undefined
  @Input() idx: number | undefined

  @ViewChild(SbbExpansionPanel, { static: true }) tripPanel: SbbExpansionPanel | undefined;

  public tripHeaderStats: TripHeaderStats;

  public mapTrip: MapTrip | null;

  constructor(private userTripService: UserTripService, private mapService: MapService, private languageService: LanguageService) {
    this.tripHeaderStats = <TripHeaderStats>{}
    this.mapTrip = null;
  }

  ngOnInit() {
    if (!this.trip) {
      return;
    }

    this.initTripHeaderStats(this.trip);

    this.mapTrip = {
      legs: [],
    };

    this.trip.legs.forEach(leg => {
      const forceLinkProjection = !TripLegGeoController.shouldUseBeeline(leg);

      const mapTripLeg: MapTripLeg = {
        leg: leg,
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
    if (!this.trip) {
      return;
    }

    this.userTripService.selectActiveTrip(this.mapTrip);
    this.mapService.zoomToTrip(this.trip);
  }

  private initTripHeaderStats(trip: OJP.Trip) {
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

    this.tripHeaderStats.tripFromTime = OJP.DateHelpers.formatTimeHHMM(trip.stats.startDatetime);
    
    this.tripHeaderStats.tripToTime = OJP.DateHelpers.formatTimeHHMM(trip.stats.endDatetime);
    const dayDiff = JourneyResultRowComponent.getDayOffset(trip.stats.endDatetime, trip.stats.startDatetime);
    if(dayDiff > 0){
      this.tripHeaderStats.tripToTime = '(+' + dayDiff + 'd) ' + this.tripHeaderStats.tripToTime;
    }

    this.tripHeaderStats.tripDurationS = trip.stats.duration.formatDuration()

    this.tripHeaderStats.tripDistanceS = (() => {
      if (DEBUG_LEVEL !== 'DEBUG') {
        return OJP.DateHelpers.formatDistance(trip.stats.distanceMeters);
      }

      const sourceF = trip.stats.distanceSource === 'trip' ? 'Δ' : 'Σ';
      const distanceF = OJP.DateHelpers.formatDistance(trip.stats.distanceMeters);

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

  public async reloadTripLegIdx(legIdx: number) {
    if (!this.trip) {
      return;
    }

    const tripXML = this.trip.asXML();
    // console.log(tripXML);

    // TODO - when migrating this code to next version we dont need to serialize/deserialize the obj anymore
    const tripV2 = OJP_Next.Trip.initWithTripXML(tripXML);

    const trrRequest = OJP_Next.TripRefineRequest.initWithTrip(tripV2);

    const stage = this.userTripService.getStageConfig();

    const ojpSDK_Next = new OJP_Next.SDK(REQUESTOR_REF, stage, this.languageService.language);
    await ojpSDK_Next.fetchTRR_Trips(trrRequest);

    if (trrRequest.requestInfo.responseXML === null) {
      console.error('no responseXML');
      console.log(trrRequest);
      debugger;
      return;
    }

    // TRR response is similar with TR response
    const trRequest = OJP.TripRequest.initWithResponseMock(trrRequest.requestInfo.responseXML);
    const trResponse = await trRequest.fetchResponse();

    if (trResponse.trips.length !== 1) {
      console.error('Expected 1 trip in reponse');
      console.log(trResponse);
      return;
    }
    
    const updatedTrip = trResponse.trips[0];

    const fareRequestStageConfig = this.userTripService.getStageConfig('NOVA-INT');
    const fareRequest = new OJP.NovaRequest(fareRequestStageConfig);
    const fareRequestResponse = await fareRequest.fetchResponseForTrips([updatedTrip]);

    if (fareRequestResponse.fareResults.length === 1) {
      updatedTrip.tripFareResults = fareRequestResponse.fareResults[0].tripFareResults;
    } else {
      // if curreny NOVA fails, rely on older version of fares
      console.log('error: nova failed to return new fares, use old ones');
      updatedTrip.tripFareResults = this.trip.tripFareResults;
    }

    this.trip = updatedTrip;
  }

  public redrawTripOnMap(legData: { legIdx: number, checked: boolean }) {
    if (!this.mapTrip) {
      return;
    }

    this.mapTrip.legs[legData.legIdx].forceLinkProjection = legData.checked;
    this.userTripService.selectActiveTrip(this.mapTrip);
  }
}
