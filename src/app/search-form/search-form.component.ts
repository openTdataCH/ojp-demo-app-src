import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl } from '@angular/forms';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { debounceTime } from 'rxjs';

import { SbbDialog } from "@sbb-esta/angular/dialog";
import { SbbExpansionPanel } from '@sbb-esta/angular/accordion';
import { SbbNotificationToast } from '@sbb-esta/angular/notification-toast';
import { SbbRadioChange } from '@sbb-esta/angular/radio-button';

import OJP_Legacy from '../config/ojp-legacy';

import { APP_STAGE, APP_STAGEs, DEBUG_LEVEL, REQUESTOR_REF, OJP_VERSION } from '../config/constants';

import { DateHelpers } from '../helpers/date-helpers';

import { UserTripService } from '../shared/services/user-trip.service'
import { LanguageService } from '../shared/services/language.service';

import { MapService } from '../shared/services/map.service';
import { InputXmlPopoverComponent } from './input-xml-popover/input-xml-popover.component';
import { EmbedSearchPopoverComponent } from './embed-search-popover/embed-search-popover.component';
import { DebugXmlPopoverComponent } from './debug-xml-popover/debug-xml-popover.component';


import { OJPHelpers } from '../helpers/ojp-helpers';

@Component({
  selector: 'app-search-form',
  templateUrl: './search-form.component.html',
  styleUrls: ['./search-form.component.scss']
})
export class SearchFormComponent implements OnInit {
  @ViewChild(SbbExpansionPanel, { static: true }) searchPanel: SbbExpansionPanel | undefined;

  private isSmallScreen = false;

  public fromLocationText: string
  public toLocationText: string
  public viaText: string
  public viaDwellTime = new FormControl('');

  public appStageOptions: APP_STAGE[] = []

  public isSearching: boolean

  public requestDurationF: string | null
  public currentRequestInfo: OJP_Legacy.RequestInfo | null

  private lastCustomTripRequestXML: string | null

  public isEmbed: boolean

  public searchDate: Date
  public searchTime: string

  public headerText: string

  public tripRequestBoardingTypes: OJP_Legacy.TripRequestBoardingType[]

  private useMocks: boolean

  public gistURL: string | null;

  public showURLS: boolean;

  constructor(
    private notificationToast: SbbNotificationToast,
    private popover: SbbDialog,
    private router: Router,
    private languageService: LanguageService,
    public userTripService: UserTripService,
    private mapService: MapService,
    private breakpointObserver: BreakpointObserver,
  ) {
    const searchDate = this.userTripService.departureDate
    this.searchDate = searchDate
    this.searchTime = OJP_Legacy.DateHelpers.formatTimeHHMM(searchDate);

    this.fromLocationText = ''
    this.toLocationText = ''
    this.viaText = ''

    this.appStageOptions = APP_STAGEs;

    this.isSearching = false;

    this.requestDurationF = null;
    this.currentRequestInfo = null;

    this.lastCustomTripRequestXML = null

    this.useMocks = false

    this.headerText = 'Search'

    this.tripRequestBoardingTypes = ['Dep', 'Arr'];

    const queryParams = new URLSearchParams(document.location.search);
    this.useMocks = queryParams.get('use_mocks') === 'yes';
    
    this.isEmbed = this.router.url.indexOf('/embed/') !== -1;

    this.gistURL = null;
    this.showURLS = DEBUG_LEVEL === 'DEBUG';
  }

  ngOnInit() {
    if (this.useMocks) {
      this.initLocationsFromMocks()
      return;
    }

    this.userTripService.locationsUpdated.subscribe(nothing => {
      this.updateLocationTexts();
      this.updateViaDwellTime();
    })

    this.userTripService.tripsDataUpdated.subscribe(tripsData => {
      const hasTrips = tripsData.length > 0
      if (hasTrips) {
        this.collapseSearchPanel()
      } else {
        this.expandSearchPanel()
      }
    });

    this.userTripService.searchParamsReset.subscribe(() => {
      this.expandSearchPanel();
      this.requestDurationF = null;
      this.currentRequestInfo = null;
    });

    this.userTripService.searchFormAfterDefaultsInited.subscribe(nothing => {
      this.customInitFromParams();
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

    this.userTripService.initDefaults(this.languageService.language);

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

  private customInitFromParams() {
    const queryParams = new URLSearchParams(document.location.search);
    
    const doSearch = queryParams.get('do_search') ?? false;
    if (doSearch) {
      this.handleTapOnSearch();
      return;
    }

    const gistId = queryParams.get('gist');
    if (gistId) {
      this.initFromGistRef(gistId);
      return;
    }
  }

  private updateLocationTexts() {
    const endpointTypes: OJP_Legacy.JourneyPointType[] = ['From', 'To'];
    const fromToTextParts: string[] = [];
    endpointTypes.forEach(endpointType => {
      const tripLocationPoint = endpointType === 'From' ? this.userTripService.fromTripLocation : this.userTripService.toTripLocation
      const location = tripLocationPoint?.location ?? null

      if (location === null) {
        return
      }

      let locationText = location.computeLocationName() ?? '';

      if (endpointType === 'From') {
        this.fromLocationText = locationText.trim()
      } else {
        this.toLocationText = locationText.trim()
      }

      fromToTextParts.push(locationText);
    });

    if (this.userTripService.viaTripLocations.length > 0) {
      const firstViaLocation = this.userTripService.viaTripLocations[0].location;
      this.viaText = firstViaLocation.computeLocationName() ?? 'Name n/a';
    }

    const textParts: string[] = [];
    if (this.fromLocationText === '') {
      textParts.push('From Location');
    } else {
      textParts.push(this.fromLocationText);
    }

    textParts.push('-');

    if (this.toLocationText === '') {
      textParts.push('To Location');
    } else {
      textParts.push(this.toLocationText);
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
    const xmlConfig = isOJPv2 ? OJP_Legacy.XML_ConfigOJPv2 : OJP_Legacy.XML_BuilderConfigOJPv1;

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
        this.userTripService.massageTrips(response.trips);
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

  onLocationSelected(location: OJP_Legacy.Location | null, originType: OJP_Legacy.JourneyPointType) {
    this.userTripService.updateTripEndpoint(location, originType, 'SearchForm');
  }

  onChangeStageAPI(ev: SbbRadioChange) {
    const newAppStage = ev.value as APP_STAGE
    this.userTripService.updateAppStage(newAppStage)

    this.userTripService.refetchEndpointsByName(this.languageService.language);
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
    this.userTripService.updateDepartureDateTime(this.computeFormDepartureDate());

    const includeLegProjectionStep1 = false;
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
      this.userTripService.selectActiveTrip(null);

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

      this.userTripService.selectActiveTrip(null);
      return;
    }

    this.userTripService.fetchFares(this.languageService.language);

    // build a hash of trips so they can be looked up later, TripId is not consistent
    const mapTripsRequest1: Record<string, OJP_Legacy.Trip> = {};
    trips.forEach(trip => {
      const tripHash = OJPHelpers.computeTripHash(trip);
      mapTripsRequest1[tripHash] = trip;
    });

    // step2 - this time with link projection

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
          if (leg.legType === 'TimedLeg') {
            const trip2TimedLeg = trip2.legs[idx] as OJP_Legacy.TripTimedLeg;
            const trip1TimedLeg = leg as OJP_Legacy.TripTimedLeg;
            trip1TimedLeg.legTrack = trip2TimedLeg.legTrack;
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

  private logResponseTime(requestInfo: OJP_Legacy.RequestInfo, messagePrefix: string) {
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
        const xmlConfig = isOJPv2 ? OJP_Legacy.XML_ConfigOJPv2 : OJP_Legacy.XML_BuilderConfigOJPv1;

        const request = OJP_Legacy.TripRequest.initWithResponseMock(tripsResponseXML, xmlConfig, REQUESTOR_REF);
        request.fetchResponse().then((response) => {
          popover.inputTripRequestResponseXML = tripsResponseXML;
          dialogRef.close();

          this.userTripService.massageTrips(response.trips);
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
    this.searchTime = OJP_Legacy.DateHelpers.formatTimeHHMM(nowDateTime);
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

  private computeTripRequest(includeLegProjection: boolean = false) {
    const isOJPv2 = OJP_VERSION === '2.0';
    const xmlConfig = isOJPv2 ? OJP_Legacy.XML_ConfigOJPv2 : OJP_Legacy.XML_BuilderConfigOJPv1;

    const stageConfig = this.userTripService.getStageConfig();
    const viaTripLocations = this.userTripService.isViaEnabled ? this.userTripService.viaTripLocations : [];

    const tripRequest = OJP_Legacy.TripRequest.initWithTripLocationsAndDate(
      stageConfig, 
      this.languageService.language,
      xmlConfig,
      REQUESTOR_REF,

      this.userTripService.fromTripLocation,
      this.userTripService.toTripLocation,
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
