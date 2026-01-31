import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { DomSanitizer } from '@angular/platform-browser';
import { debounceTime } from 'rxjs';

import { SbbDialog } from "@sbb-esta/angular/dialog";
import { SbbExpansionPanel } from '@sbb-esta/angular/accordion';
import { SbbNotificationToast } from '@sbb-esta/angular/notification-toast';
import { SbbRadioChange } from '@sbb-esta/angular/radio-button';

import * as OJP_Next from 'ojp-sdk-next';

import OJP_Legacy from '../config/ojp-legacy';

import { APP_STAGE, APP_STAGEs, DEBUG_LEVEL, REQUESTOR_REF, OJP_VERSION } from '../config/constants';

import { DateHelpers } from '../helpers/date-helpers';

import { UserTripService } from '../shared/services/user-trip.service'
import { LanguageService } from '../shared/services/language.service';

import { InputXmlPopoverComponent } from './input-xml-popover/input-xml-popover.component';
import { EmbedSearchPopoverComponent } from './embed-search-popover/embed-search-popover.component';
import { DebugXmlPopoverComponent } from './debug-xml-popover/debug-xml-popover.component';
import { ReportIssueComponent } from '../shared/components/report-issue.component';

import { OJPHelpers } from '../helpers/ojp-helpers';
import { AnyPlace, PlaceBuilder } from '../shared/models/place/place-builder';
import { JourneyPointType, TripRequestBoardingType } from '../shared/types/_all';

@Component({
  selector: 'app-search-form',
  templateUrl: './search-form.component.html',
  styleUrls: ['./search-form.component.scss']
})
export class SearchFormComponent implements OnInit {
  @ViewChild(SbbExpansionPanel, { static: true }) searchPanel: SbbExpansionPanel | undefined;

  private isSmallScreen = false;

  public fromPlace: AnyPlace | null;
  public toPlace: AnyPlace | null;
  public viaPlaces: AnyPlace[];
  public viaDwellTime = new FormControl('');

  public appStageOptions: APP_STAGE[] = [];

  public isSearching: boolean;

  public requestDurationF: string | null;
  public currentRequestInfo: OJP_Next.RequestInfo | null;

  private lastCustomTripRequestXML: string | null;

  public isEmbed: boolean;

  public searchDate: Date;
  public searchTime: string;

  public headerText: string;

  public tripRequestBoardingTypes: TripRequestBoardingType[];

  private useMocks: boolean;

  public gistURL: string | null;

  constructor(
    private notificationToast: SbbNotificationToast,
    private popover: SbbDialog,
    private router: Router,
    private languageService: LanguageService,
    public userTripService: UserTripService,
    private breakpointObserver: BreakpointObserver,
    private sanitizer: DomSanitizer,
  ) {
    const searchDate = this.userTripService.departureDate;
    this.searchDate = searchDate;
    this.searchTime = OJP_Next.DateHelpers.formatTimeHHMM(searchDate);

    this.fromPlace = null;
    this.toPlace = null;
    this.viaPlaces = [];

    this.appStageOptions = APP_STAGEs;

    this.isSearching = false;

    this.requestDurationF = null;
    this.currentRequestInfo = null;

    this.lastCustomTripRequestXML = null;

    this.useMocks = false;

    this.headerText = 'Search';

    this.tripRequestBoardingTypes = ['Dep', 'Arr'];

    const queryParams = new URLSearchParams(document.location.search);
    this.useMocks = queryParams.get('use_mocks') === 'yes';
    
    this.isEmbed = this.router.url.indexOf('/embed/') !== -1;

    this.gistURL = null;
  }

  async ngOnInit(): Promise<void> {
    if (this.useMocks) {
      this.initLocationsFromMocks()
      return;
    }

    this.userTripService.locationsUpdated.subscribe(nothing => {
      this.updateLocationTexts();
      this.updateViaDwellTime();
    })

    this.userTripService.tripsDataUpdated.subscribe(tripsData => {
      const hasTrips = tripsData.length > 0;
      if (hasTrips) {
        this.collapseSearchPanel();
      } else {
        this.expandSearchPanel();
      }
    });

    this.userTripService.searchParamsReset.subscribe(() => {
      this.expandSearchPanel();
      this.requestDurationF = null;
      this.currentRequestInfo = null;
    });

    this.userTripService.searchFormAfterDefaultsInited.subscribe(async nothing => {
      await this.customInitFromParams();
    });

    this.userTripService.tripRequestFinished.subscribe(requestInfo => {
      const requestNetworkDuration = DateHelpers.computeExecutionTime(requestInfo.requestDateTime, requestInfo.responseDateTime);
      const requestParseDuration = DateHelpers.computeExecutionTime(requestInfo.responseDateTime, requestInfo.parseDateTime);
      this.requestDurationF = (requestNetworkDuration + requestParseDuration).toFixed(2) + ' sec';

      this.currentRequestInfo = requestInfo;
    });

    this.viaDwellTime.valueChanges.pipe(debounceTime(300)).subscribe(value => {
      this.updateViaDwellTime();
    });

    await this.userTripService.initDefaults(this.languageService.language);

    this.breakpointObserver.observe([Breakpoints.Small, Breakpoints.XSmall])
      .subscribe(result => {
        this.isSmallScreen = result.matches;
      });
  }

  private updateViaDwellTime() {
    if (this.userTripService.viaTripLocations.length === 0) {
      return;
    }

    let viaDwellTimeValue: number | null = Number(this.viaDwellTime.value);
    viaDwellTimeValue = isNaN(viaDwellTimeValue) ? null : viaDwellTimeValue;
    
    const firstVia = this.userTripService.viaTripLocations[0];
    firstVia.dwellTimeMinutes = viaDwellTimeValue;
  }

  private async customInitFromParams() {
    const queryParams = new URLSearchParams(document.location.search);
    
    const doSearch = queryParams.get('do_search') ?? false;
    if (doSearch) {
      await this.handleTapOnSearch();
      return;
    }

    const gistId = queryParams.get('gist');
    if (gistId) {
      await this.initFromGistRef(gistId);
      return;
    }
  }

  private updateLocationTexts() {
    const endpointTypes: JourneyPointType[] = ['From', 'To'];
    const fromToTextParts: string[] = [];
    endpointTypes.forEach(endpointType => {
      const tripLocationPoint = endpointType === 'From' ? this.userTripService.fromTripPlace : this.userTripService.toTripPlace;
      if (tripLocationPoint === null) {
        return;
      }
      const place = tripLocationPoint.place;

      if (endpointType === 'From') {
        this.fromPlace = place;
      } else {
        this.toPlace = place;
      }

      fromToTextParts.push(place?.computeName() ?? '')
    });

    if (this.userTripService.viaTripLocations.length > 0) {
      this.viaPlaces = [];
      this.userTripService.viaTripLocations.forEach(viaTripLocation => {
        this.viaPlaces.push(viaTripLocation.place);
      });
    }

    const textParts: string[] = [];
    if (this.fromPlace === null) {
      textParts.push('From Location');
    } else {
      textParts.push(this.fromPlace.computeName());
    }

    textParts.push('-');

    if (this.toPlace === null) {
      textParts.push('To Location');
    } else {
      textParts.push(this.toPlace.computeName());
    }

    this.headerText = textParts.join(' ');
  }

  private async initLocationsFromMocks() {
    const mockURL = '/path/to/mock';

    const mockText = await (await fetch(mockURL)).text();
    this.initFromMockXML(mockText);
  }

  private async initFromMockXML(mockText: string) {
    const isOJPv2 = OJP_VERSION === '2.0';
    const xmlConfig = isOJPv2 ? OJP_Next.DefaultXML_Config : OJP_Next.XML_BuilderConfigOJPv1;

    const request = OJP_Legacy.TripRequest.initWithResponseMock(mockText, xmlConfig, REQUESTOR_REF);
    request.fetchResponseWithCallback((response) => {
      if (response.message === 'TripRequest.TripsNo') {
        if (DEBUG_LEVEL === 'DEBUG') {
          console.log('DEBUG: TripsNo => ' + response.tripsNo);
        }
      }
      if (response.message === 'TripRequest.Trip') {
        if (DEBUG_LEVEL === 'DEBUG') {
          console.log('DEBUG: New Trip => ' + response.trips.length + '/' + response.tripsNo);
        }
        
        if (response.trips.length === 1) {
          this.handleCustomTripResponse(response.trips, request, false);
        }
      }
      if (response.message === 'TripRequest.DONE') {
        this.collapseSearchPanel();
        this.handleCustomTripResponse(response.trips, request, true);
      }
    });
  }

  private async initFromGistRef(gistId: string) {
    const mockText = await OJPHelpers.fetchGist(gistId);
    if (mockText === null) {
      console.error('initFromGistRef: cant fetch gist XML');
      return;
    }

    this.gistURL = 'https://gist.github.com/' + gistId;

    this.initFromMockXML(mockText);
  }

  onPlaceSelected(newPlace: AnyPlace, originType: JourneyPointType) {
    this.userTripService.updateTripEndpoint(newPlace, originType, 'SearchForm');
  }

  public async onChangeStageAPI(ev: SbbRadioChange) {
    const newAppStage = ev.value as APP_STAGE;
    this.userTripService.updateAppStage(newAppStage);

    await this.userTripService.refetchEndpointsByName(this.languageService.language);
  }

  onChangeDateTime() {
    this.userTripService.updateDepartureDateTime(this.computeFormDepartureDate())
  }

  private computeFormDepartureDate(): Date {
    const departureDate = this.searchDate;
    
    const timeParts = this.searchTime.split(':');
    if (timeParts.length === 2) {
      const timeHours = parseInt(timeParts[0]);
      const timeMinutes = parseInt(timeParts[1]);

      departureDate.setHours(timeHours);
      departureDate.setMinutes(timeMinutes);
    }

    return departureDate
  }

  shouldDisableSearchButton(): boolean {
    if (this.isSearching) {
      return true
    }

    return false
  }

  public async handleTapOnSearch() {
    // Do 2 TR only for public transport routes
    const doTwiceTR = (this.userTripService.tripModeType === 'monomodal') && (this.userTripService.tripTransportMode === 'public_transport');

    this.userTripService.updateDepartureDateTime(this.computeFormDepartureDate());

    const includeLegProjectionStep1 = !doTwiceTR;
    const tripRequestStep1 = this.computeTripRequest(includeLegProjectionStep1);
    if (tripRequestStep1 === null) {
      this.notificationToast.open('Please check from/to input points', {
        type: 'error',
        verticalPosition: 'top',
      });
      return;
    }

    this.notificationToast.dismiss();

    this.isSearching = true;
    const responseStep1 = await tripRequestStep1.fetchResponse();
    this.isSearching = false;

    this.logResponseTime(tripRequestStep1.requestInfo, 'DEBUG TR - 1st request');

    if (responseStep1.message === 'ERROR') {
      this.notificationToast.open('ParseTripsXMLError', {
        type: 'error',
        verticalPosition: 'top',
      });

      this.userTripService.journeyTripRequests = [];

      this.requestDurationF = null;

      this.userTripService.updateTrips([]);
      this.userTripService.mapActiveTripSelected.emit(null);

      return;
    }

    const trips = responseStep1.trips;
    this.userTripService.journeyTripRequests = [tripRequestStep1];

    this.userTripService.tripRequestFinished.emit(tripRequestStep1.requestInfo);
    this.userTripService.updateTrips(trips);

    const hasTrips = trips.length > 0;
    if (!hasTrips) {
      this.notificationToast.open('No trips found', {
        type: 'info',
        verticalPosition: 'top',
      });

      this.userTripService.mapActiveTripSelected.emit(null);
      this.userTripService.tripsDataUpdated.emit([]);
      return;
    }

    // no need for AWAIT, FareResult call is fire and forget
    //    -> it will update the mapFareResult in JourneyResultsComponent component
    this.userTripService.fetchFares(this.languageService.language);

    // build a hash of trips so they can be looked up later, TripId is not consistent
    const mapTripsRequest1: Record<string, OJP_Legacy.Trip> = {};
    trips.forEach(trip => {
      const tripHash = OJPHelpers.computeTripHash(trip);
      mapTripsRequest1[tripHash] = trip;
    });

    // step2 - this time with link projection
    //        - only for public transport requests
    if (!doTwiceTR) {
      return;
    }

    const includeLegProjectionStep2 = true;
    const tripRequestStep2 = this.computeTripRequest(includeLegProjectionStep2);
    if (tripRequestStep2 === null) {
      return;
    }

    // update the legTrack of trips from step1
    const responseStep2 = await tripRequestStep2.fetchResponse();
    this.logResponseTime(tripRequestStep2.requestInfo, 'DEBUG TR - 2nd request');

    responseStep2.trips.forEach(trip2 => {
      const trip2Hash = OJPHelpers.computeTripHash(trip2);
      const trip1 = mapTripsRequest1[trip2Hash] ?? null;
      if (trip1) {
        trip1.legs.forEach((leg, idx) => {
          if (leg.legTrack) {
            const leg2 = trip2.legs[idx];
            if (leg2.legTrack) {
              leg.legTrack = leg2.legTrack;
            }
          }

          const isContinuousLeg = (leg.legType === 'ContinuousLeg') || (leg.legType === 'TransferLeg');
          if (isContinuousLeg) {
            const trip1ContinuousLeg = leg as OJP_Legacy.TripContinuousLeg;
            const trip2ContinuousLeg = trip2.legs[idx] as OJP_Legacy.TripContinuousLeg;
            if (trip1ContinuousLeg.pathGuidance && trip2ContinuousLeg.pathGuidance) {
              trip1ContinuousLeg.pathGuidance = trip2ContinuousLeg.pathGuidance;
            }
          }
        });
      }
    });

    // update the requests / response XML only if we have same trips (same number)
    if (responseStep2.trips.length === responseStep1.trips.length) {
      this.userTripService.journeyTripRequests = [tripRequestStep2];
      this.userTripService.tripRequestFinished.emit(tripRequestStep2.requestInfo);
    }

    this.userTripService.updateTrips(trips);
  }

  private logResponseTime(requestInfo: OJP_Next.RequestInfo, messagePrefix: string) {
    if (DEBUG_LEVEL !== 'DEBUG') {
      return;
    }

    const requestNetworkDuration = DateHelpers.computeExecutionTime(requestInfo.requestDateTime, requestInfo.responseDateTime);
    const requestParseDuration = DateHelpers.computeExecutionTime(requestInfo.responseDateTime, requestInfo.parseDateTime);
    const requestDurationF = (requestNetworkDuration + requestParseDuration).toFixed(2) + ' sec';
    console.log(messagePrefix + ': ' + requestDurationF);
  }

  private expandSearchPanel() {
    this.searchPanel?.open()
  }

  private collapseSearchPanel() {
    this.searchPanel?.close()
  }

  public loadInputTripXMLPopover() {
    const dialogRef = this.popover.open(InputXmlPopoverComponent, {
      position: { top: '20px' },
      width: '50vw',
    });
    dialogRef.afterOpened().subscribe(() => {
      const popover = dialogRef.componentInstance as InputXmlPopoverComponent
      const currentTR = this.computeTripRequest();
      if (currentTR) {
        // force re-built of XML request
        currentTR.updateRequestXML();
        
        popover.inputTripRequestXML = currentTR.requestInfo.requestXML ?? 'n/a';
      }

      const handleCustomXMLResponse = (tripsResponseXML: string) => {
        this.lastCustomTripRequestXML = popover.inputTripRequestXML;

        const isOJPv2 = OJP_VERSION === '2.0';
        const xmlConfig = isOJPv2 ? OJP_Next.DefaultXML_Config : OJP_Next.XML_BuilderConfigOJPv1;

        const request = OJP_Legacy.TripRequest.initWithResponseMock(tripsResponseXML, xmlConfig, REQUESTOR_REF);
        request.fetchResponse().then((response) => {
          popover.inputTripRequestResponseXML = tripsResponseXML;
          dialogRef.close();

          this.handleCustomTripResponse(response.trips, request, true);
        });
      };

      popover.tripCustomRequestSaved.subscribe(handleCustomXMLResponse);
      popover.tripCustomResponseSaved.subscribe(handleCustomXMLResponse);
    });
  }

  private handleCustomTripResponse(trips: OJP_Legacy.Trip[], request: OJP_Legacy.TripRequest, isDoneParsing: boolean) {
    this.requestDurationF = 'USER XML';
    this.isSearching = false;

    this.userTripService.tripRequestFinished.emit(request.requestInfo);
    
    this.userTripService.journeyTripRequests = [request];
    this.userTripService.updateTrips(trips);
    this.updateSearchForm(trips);
  }

  private updateSearchForm(trips: OJP_Legacy.Trip[]) {
    if (trips.length === 0) {
      return;
    }
    const firstTrip = trips[0];

    this.userTripService.updateParamsFromTrip(firstTrip);
    this.updateLocationTexts();
  }

  public swapEndpoints() {
    this.userTripService.switchEndpoints();
  }

  public loadEmbedHTMLPopover() {
    const dialogRef = this.popover.open(EmbedSearchPopoverComponent, {
      position: { top: '20px' },
    });

    dialogRef.afterOpened().subscribe(() => {
      const popover = dialogRef.componentInstance as EmbedSearchPopoverComponent
      // handle popover vars
    })
  }

  public toggleViaState() {
    this.userTripService.updateVia();
  }

  public resetDateTime() {
    const nowDateTime = new Date();
    this.searchDate = nowDateTime;
    this.searchTime = OJP_Next.DateHelpers.formatTimeHHMM(nowDateTime);
    this.userTripService.updateDepartureDateTime(this.computeFormDepartureDate());
  }

  public showRequestXMLPopover() {
    const dialogRef = this.popover.open(DebugXmlPopoverComponent, {
      position: { top: '20px' },
      width: '50vw',
      height: '90vh',
    });
    dialogRef.afterOpened().subscribe(() => {
      if (this.currentRequestInfo) {
        const popover = dialogRef.componentInstance as DebugXmlPopoverComponent;
        popover.isTripRequest = true;
        popover.updateRequestData(this.currentRequestInfo);
      }
    });
  }

  public reportIssueXMLPopover() {
    const dialogWidth = this.isSmallScreen ? '90vw' : '50vw';

    const dialogRef = this.popover.open(ReportIssueComponent, {
      position: { top: '20px' },
      width: dialogWidth,
    });
    dialogRef.afterOpened().subscribe(() => {
      const popover = dialogRef.componentInstance as ReportIssueComponent;
      if (this.currentRequestInfo) {
        const popover = dialogRef.componentInstance as ReportIssueComponent;
        popover.requestInfo = this.currentRequestInfo;

        const isOJPv2 = OJP_VERSION === '2.0';
        const issueTitle: string = (() => {
          if (!isOJPv2) {
            return '[OJP v1.0][TR issue] ';
          }

          return '[TR issue] ';
        })();

        const requestURL = window.location.href;

        popover.setInputValue('issueTitle', issueTitle);
        popover.updateMetadataRows(requestURL);
      }
    });
  }

  private computeTripRequest(includeLegProjection: boolean = false) {
    const isOJPv2 = OJP_VERSION === '2.0';
    const xmlConfig = isOJPv2 ? OJP_Next.DefaultXML_Config : OJP_Next.XML_BuilderConfigOJPv1;

    const stageConfig = this.userTripService.getStageConfig();
    const viaTripLocations = this.userTripService.isViaEnabled ? this.userTripService.viaTripLocations.map(el => el.asOJP_TripLocationPoint()) : [];

    const fromTripLocation = this.userTripService.fromTripPlace?.asOJP_TripLocationPoint() ?? null;
    const toTripLocation = this.userTripService.toTripPlace?.asOJP_TripLocationPoint() ?? null;

    const tripRequest = OJP_Legacy.TripRequest.initWithTripLocationsAndDate(
      stageConfig, 
      this.languageService.language,
      xmlConfig,
      REQUESTOR_REF,

      fromTripLocation,
      toTripLocation,
      this.userTripService.departureDate,
      this.userTripService.currentBoardingType,
      includeLegProjection,
      this.userTripService.tripModeType,
      this.userTripService.tripTransportMode,
      viaTripLocations,
      this.userTripService.numberOfResults,
      this.userTripService.numberOfResultsBefore,
      this.userTripService.numberOfResultsAfter,
      this.userTripService.publicTransportModesFilter,
      this.userTripService.railSubmodesFilter,
    );

    if (tripRequest !== null) {
      tripRequest.enableExtensions = this.userTripService.currentAppStage !== 'OJP-SI';
      tripRequest.useRealTimeDataType = this.userTripService.useRealTimeDataType;

      if (isOJPv2) {
        tripRequest.walkSpeedDeviation = this.userTripService.walkSpeedDeviation;
      }
    }

    return tripRequest;
  }
}
