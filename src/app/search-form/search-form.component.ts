import { Component, OnInit, ViewChild } from '@angular/core';

import { DateHelpers } from '../helpers/date-helpers';

import { UserTripService } from '../shared/services/user-trip.service'
import { LanguageService } from '../shared/services/language.service';

import { MapService } from '../shared/services/map.service';
import { InputXmlPopoverComponent } from './input-xml-popover/input-xml-popover.component';
import { EmbedSearchPopoverComponent } from './embed-search-popover/embed-search-popover.component';

import { SbbDialog } from "@sbb-esta/angular/dialog";
import { SbbExpansionPanel } from '@sbb-esta/angular/accordion';
import { SbbNotificationToast } from '@sbb-esta/angular/notification-toast';
import { SbbRadioChange } from '@sbb-esta/angular/radio-button';

import * as OJP from 'ojp-sdk'

import { APP_STAGE, DEBUG_LEVEL } from '../config/app-config';
import { Router } from '@angular/router';

@Component({
  selector: 'app-search-form',
  templateUrl: './search-form.component.html',
  styleUrls: ['./search-form.component.scss']
})
export class SearchFormComponent implements OnInit {
  @ViewChild(SbbExpansionPanel, { static: true }) searchPanel: SbbExpansionPanel | undefined;

  public fromLocationText: string
  public toLocationText: string

  public appStageOptions: APP_STAGE[] = []

  public isSearching: boolean

  public tripRequestFormattedXML: string
  public tripResponseFormattedXML: string
  public requestDurationF: string | null

  private lastCustomTripRequestXML: string | null

  public isEmbed: boolean

  public searchDate: Date
  public searchTime: string

  public headerText: string

  public tripRequestBoardingTypes: OJP.TripRequestBoardingType[]

  private useMocks: boolean

  constructor(
    private notificationToast: SbbNotificationToast,
    private tripXmlPopover: SbbDialog,
    private embedHTMLPopover: SbbDialog,
    private router: Router,
    private languageService: LanguageService,
    public userTripService: UserTripService,
    private mapService: MapService
  ) {
    const searchDate = this.userTripService.departureDate
    this.searchDate = searchDate
    this.searchTime = OJP.DateHelpers.formatTimeHHMM(searchDate);

    this.fromLocationText = ''
    this.toLocationText = ''

    this.appStageOptions = ['PROD', 'INT', 'TEST', 'LA Beta']

    this.isSearching = false;

    this.tripRequestFormattedXML = 'RequestXML'
    this.tripResponseFormattedXML = 'ResponseXML'
    this.requestDurationF = null;

    this.lastCustomTripRequestXML = null

    this.useMocks = false

    this.headerText = 'Search'

    this.tripRequestBoardingTypes = ['Dep', 'Arr'];

    const queryParams = new URLSearchParams(document.location.search);
    this.useMocks = queryParams.get('use_mocks') === 'yes';
    
    this.isEmbed = this.router.url.indexOf('/embed/') !== -1;
  }

  ngOnInit() {
    this.userTripService.locationsUpdated.subscribe(nothing => {
      this.updateLocationTexts();
    })

    this.userTripService.tripsUpdated.subscribe(trips => {
      const hasTrips = trips.length > 0
      if (hasTrips) {
        this.collapseSearchPanel()
      } else {
        this.expandSearchPanel()
      }
    });

    this.userTripService.searchParamsReset.subscribe(() => {
      this.expandSearchPanel();
      this.requestDurationF = null;
    });

    this.userTripService.defaultsInited.subscribe(nothing => {
      this.customInitFromParams();
    });

    this.userTripService.tripRequestFinished.subscribe(requestInfo => {
      const requestNetworkDuration = DateHelpers.computeExecutionTime(requestInfo.requestDateTime, requestInfo.responseDateTime);
      const requestParseDuration = DateHelpers.computeExecutionTime(requestInfo.responseDateTime, requestInfo.parseDateTime);
      this.requestDurationF = (requestNetworkDuration + requestParseDuration).toFixed(2) + ' sec';
    });


    this.userTripService.initDefaults(this.languageService.language);
  }

  private customInitFromParams() {
    if (this.useMocks) {
      this.initLocationsFromMocks()
      return;
    }

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
    const endpointTypes: OJP.JourneyPointType[] = ['From', 'To'];
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
    })

    if (this.isEmbed) {
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
  }

  private async initLocationsFromMocks() {
    const mockURL = '/path/to/mock';

    const mockText = await (await fetch(mockURL)).text();
    this.initFromMockXML(mockText);
  }

  private async initFromMockXML(mockText: string) {
    const request = OJP.TripRequest.initWithResponseMock(mockText);
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
        this.userTripService.massageTrips(response.trips);
        this.handleCustomTripResponse(response.trips, request, true);
      }
    });
  }

  private async initFromGistRef(gistId: string) {
    const gistURLMatches = gistId.match(/https:\/\/gist.github.com\/[^\/]+?\/([0-9a-z]*)/);
    if (gistURLMatches) {
      gistId = gistURLMatches[1];
    }

    const gistAPI = 'https://api.github.com/gists/' + gistId;
    const gistJSON = await (await fetch(gistAPI)).json();
    const gistFiles = gistJSON['files'] as Record<string, any>;

    for (const gistFile in gistFiles) {
      const gistFileData = gistFiles[gistFile];
      if (gistFileData['language'] !== 'XML') {
        continue;
      }

      const mockText = gistFileData['content'];
      this.initFromMockXML(mockText);

      break;
    }
  }

  onLocationSelected(location: OJP.Location | null, originType: OJP.JourneyPointType) {
    this.userTripService.updateTripEndpoint(location, originType, 'SearchForm')
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

  public handleTapOnSearch() {
    this.userTripService.updateDepartureDateTime(this.computeFormDepartureDate())

    const journeyRequestParams = OJP.JourneyRequestParams.initWithLocationsAndDate(
      this.languageService.language,
      this.userTripService.fromTripLocation,
      this.userTripService.toTripLocation,
      this.userTripService.viaTripLocations,
      this.userTripService.tripModeTypes,
      this.userTripService.tripTransportModes,
      this.userTripService.departureDate,
      this.userTripService.currentBoardingType,
      'NumberOfResults',
    );
    if (journeyRequestParams === null) {
      this.notificationToast.open('Please check from/to input points', {
        type: 'error',
        verticalPosition: 'top',
      });
      return
    }
    
    this.notificationToast.dismiss()

    const stageConfig = this.userTripService.getStageConfig()
    const journeyRequest = new OJP.JourneyRequest(stageConfig, journeyRequestParams);

    this.isSearching = true;

    journeyRequest.fetchResponse((response) => {
      if (response.error) {
        this.notificationToast.open(response.error.message, {
          type: 'error',
          verticalPosition: 'top',
        })

        this.isSearching = false;
        this.userTripService.journeyTripRequests = [];

        this.requestDurationF = null;

        this.userTripService.updateTrips([]);
        this.userTripService.selectActiveTrip(null);

        return;
      }

      const trips = response.sections.flatMap(el => el.trips);
      this.userTripService.journeyTripRequests = journeyRequest.tripRequests;
      
      if (response.message === 'JourneyRequest.DONE') {
        if (trips.length === 0) {
          this.notificationToast.open('No trips found', {
            type: 'info',
            verticalPosition: 'top',
          })
        }

        const requestInfo = journeyRequest.tripRequests[0].requestInfo;
        this.userTripService.tripRequestFinished.emit(requestInfo);

        this.isSearching = false;
        this.userTripService.updateTrips(trips);

        if (trips.length > 0) {
          // it could be that the trips order changed, zoom again to the first one
          const firstTrip = trips[0];

          this.userTripService.selectActiveTrip(firstTrip);
          this.mapService.zoomToTrip(firstTrip);

          this.userTripService.fetchFares();
        } else {
          this.userTripService.selectActiveTrip(null);
        }
      } else {
        if (response.message === 'TripRequest.Trip') {
          this.userTripService.updateTrips(trips);
          if (trips.length === 1) {
            // zoom to first trip
            const firstTrip = trips[0];
            this.mapService.zoomToTrip(firstTrip);
          }
        }

        if (response.message === 'ERROR') {
          this.isSearching = false;
        }
      }
    })
  }

  private expandSearchPanel() {
    this.searchPanel?.open()
  }

  private collapseSearchPanel() {
    this.searchPanel?.close()
  }

  public loadInputTripXMLPopover() {
    const dialogRef = this.tripXmlPopover.open(InputXmlPopoverComponent, {
      position: { top: '20px' },
    });
    dialogRef.afterOpened().subscribe(() => {
      const popover = dialogRef.componentInstance as InputXmlPopoverComponent
      popover.inputTripRequestXML = this.userTripService.computeTripRequestXML(this.languageService.language, this.computeFormDepartureDate());

      const handleCustomXMLResponse = (tripsResponseXML: string) => {
        this.lastCustomTripRequestXML = popover.inputTripRequestXML;

        const request = OJP.TripRequest.initWithResponseMock(tripsResponseXML);
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

  private handleCustomTripResponse(trips: OJP.Trip[], request: OJP.TripRequest, isDoneParsing: boolean) {
    this.requestDurationF = 'USER XML';
    this.isSearching = false;

    this.userTripService.tripRequestFinished.emit(request.requestInfo);
    
    this.userTripService.journeyTripRequests = [request];
    this.userTripService.updateTrips(trips);
    this.updateSearchForm(trips);

    const hasTrips = trips.length > 0;
    if (hasTrips) {
      const firstTrip = trips[0];

      this.userTripService.selectActiveTrip(firstTrip);
      this.mapService.zoomToTrip(firstTrip);

      if (isDoneParsing) {
        this.userTripService.fetchFares();
      }
    }
  }

  private updateSearchForm(trips: OJP.Trip[]) {
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
    const dialogRef = this.embedHTMLPopover.open(EmbedSearchPopoverComponent, {
      position: { top: '20px' },
    });

    dialogRef.afterOpened().subscribe(() => {
      const popover = dialogRef.componentInstance as EmbedSearchPopoverComponent
      // handle popover vars
    })
  }
}
