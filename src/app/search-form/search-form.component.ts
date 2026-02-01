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

import { APP_STAGE, APP_STAGEs, DEBUG_LEVEL, REQUESTOR_REF, OJP_VERSION } from '../config/constants';

import { DateHelpers } from '../helpers/date-helpers';

import { UserTripService } from '../shared/services/user-trip.service'
import { LanguageService } from '../shared/services/language.service';

import { InputXmlPopoverComponent } from './input-xml-popover/input-xml-popover.component';
import { EmbedSearchPopoverComponent } from './embed-search-popover/embed-search-popover.component';
import { DebugXmlPopoverComponent } from './debug-xml-popover/debug-xml-popover.component';
import { ReportIssueComponent } from '../shared/components/report-issue.component';

import { OJPHelpers } from '../helpers/ojp-helpers';
import { AnyPlace } from '../shared/models/place/place-builder';
import { JourneyPointType, TripRequestBoardingType } from '../shared/types/_all';
import { TripRequestBuilder } from '../shared/models/trip/trip-request';
import { Trip } from '../shared/models/trip/trip';
import { ContinuousLeg } from '../shared/models/trip/leg/continuous-leg';

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
    const sdk = this.userTripService.createOJP_SDK_Instance(this.languageService.language);
    const request2 = sdk.requests.TripRequest.initWithResponseMock(mockText);
    const response = await request2.fetchResponse(sdk);

    if (response.ok) {
      this.collapseSearchPanel();
      
      const trips = TripRequestBuilder.parseTrips(this.sanitizer, response);
      this.handleCustomTripResponse(trips, request2.requestInfo, true);
    } else {
      this.handleCustomTripResponse([], request2.requestInfo, true);
    }
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

    const sdk = this.userTripService.createOJP_SDK_Instance(this.languageService.language);

    const includeLegProjectionStep1 = !doTwiceTR;
    const tripRequestStep1 = TripRequestBuilder.computeTripRequest(this.userTripService, sdk, includeLegProjectionStep1);

    if (tripRequestStep1 === null) {
      this.notificationToast.open('Please check from/to input points', {
        type: 'error',
        verticalPosition: 'top',
      });
      return;
    }

    this.notificationToast.dismiss();

    this.isSearching = true;
    const responseStep1 = await tripRequestStep1.fetchResponse(sdk);
    this.isSearching = false;

    this.logResponseTime(tripRequestStep1.requestInfo, 'DEBUG TR - 1st request');

    if (!responseStep1.ok) {
      this.notificationToast.open('ParseTripsXMLError', {
        type: 'error',
        verticalPosition: 'top',
      });

      this.requestDurationF = null;

      this.userTripService.updateTrips([]);
      this.userTripService.mapActiveTripSelected.emit(null);

      return;
    }
    
    const trips = TripRequestBuilder.parseTrips(this.sanitizer, responseStep1);

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
    const mapTripsRequest1: Record<string, Trip> = {};
    trips.forEach(trip => {
      const tripHash = trip.computeTripHash();
      mapTripsRequest1[tripHash] = trip;
    });

    // step2 - this time with link projection
    //        - only for public transport requests
    if (!doTwiceTR) {
      return;
    }

    const includeLegProjectionStep2 = true;
    const tripRequestStep2 = TripRequestBuilder.computeTripRequest(this.userTripService, sdk, includeLegProjectionStep2);
    if (tripRequestStep2 === null) {
      return;
    }

    // update the legTrack of trips from step1
    const responseStep2 = await tripRequestStep2.fetchResponse(sdk);
    this.logResponseTime(tripRequestStep2.requestInfo, 'DEBUG TR - 2nd request');

    const responseStep2Trips = TripRequestBuilder.parseTrips(this.sanitizer, responseStep2);

    responseStep2Trips.forEach(trip2 => {
      const trip2Hash = trip2.computeTripHash();
      const trip1 = mapTripsRequest1[trip2Hash] ?? null;
      if (trip1) {
        trip1.distance = trip2.distance;
        
        trip1.legs.forEach((leg, idx) => {
          if (trip2.legs.length === trip1.legs.length) {
            trip1.legs[idx].distance = trip2.legs[idx].distance;
          }

          if (leg.legTrack) {
            const leg2 = trip2.legs[idx];
            if (leg2.legTrack) {
              leg.legTrack = leg2.legTrack;
            }
          }

          const isContinuousLeg = (leg.type === 'ContinuousLeg') || (leg.type === 'TransferLeg');
          if (isContinuousLeg) {
            const trip1ContinuousLeg = leg as ContinuousLeg;
            const trip2ContinuousLeg = trip2.legs[idx] as ContinuousLeg;
            if (trip1ContinuousLeg.pathGuidance && trip2ContinuousLeg.pathGuidance) {
              trip1ContinuousLeg.pathGuidance = trip2ContinuousLeg.pathGuidance;
            }
          }
        });
      }
    });

    // update the requests / response XML only if we have same trips (same number)
    if (responseStep2Trips.length === trips.length) {
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
      const sdk = this.userTripService.createOJP_SDK_Instance(this.languageService.language);
      const currentTR = TripRequestBuilder.computeTripRequest(this.userTripService, sdk);
      if (currentTR) {
        const isOJPv2 = OJP_VERSION === '2.0';
        const xmlConfig = isOJPv2 ? OJP_Next.DefaultXML_Config : OJP_Next.XML_BuilderConfigOJPv1;
        const requestXML = currentTR.buildRequestXML(this.languageService.language, REQUESTOR_REF, xmlConfig);
        
        popover.inputTripRequestXML = requestXML ?? 'n/a';
      }

      const handleCustomXMLResponse = async (tripsResponseXML: string) => {
        this.lastCustomTripRequestXML = popover.inputTripRequestXML;

        const sdk = this.userTripService.createOJP_SDK_Instance(this.languageService.language);
        const request = sdk.requests.TripRequest.initWithResponseMock(tripsResponseXML);
        const response = await request.fetchResponse(sdk);

        popover.inputTripRequestResponseXML = tripsResponseXML;
        dialogRef.close();

        if (response.ok) {
          const trips = TripRequestBuilder.parseTrips(this.sanitizer, response);
          this.handleCustomTripResponse(trips, request.requestInfo, true);
        } else {
          this.handleCustomTripResponse([], request.requestInfo, true);
        }
      };

      popover.tripCustomRequestSaved.subscribe(handleCustomXMLResponse);
      popover.tripCustomResponseSaved.subscribe(handleCustomXMLResponse);
    });
  }

  private handleCustomTripResponse(trips: Trip[], requestInfo: OJP_Next.RequestInfo, isDoneParsing: boolean) {
    this.requestDurationF = 'USER XML';
    this.isSearching = false;

    this.userTripService.tripRequestFinished.emit(requestInfo);
    
    this.userTripService.updateTrips(trips);
    this.updateSearchForm(trips);
  }

  private updateSearchForm(trips: Trip[]) {
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
}
