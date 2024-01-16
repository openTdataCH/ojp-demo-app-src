import { Component, OnInit, ViewChild } from '@angular/core';

import { UserTripService } from '../shared/services/user-trip.service'
import { MapService } from '../shared/services/map.service';
import { InputXmlPopoverComponent } from './input-xml-popover/input-xml-popover.component';
import { EmbedSearchPopoverComponent } from './embed-search-popover/embed-search-popover.component';

import { SbbDialog } from "@sbb-esta/angular/dialog";
import { SbbExpansionPanel } from '@sbb-esta/angular/accordion';
import { SbbNotificationToast } from '@sbb-esta/angular/notification-toast';
import { SbbRadioChange } from '@sbb-esta/angular/radio-button';

import * as OJP from 'ojp-sdk'
import mapboxgl from 'mapbox-gl'

import { APP_STAGE } from '../config/app-config';
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
  public requestDuration: string | null

  private lastCustomTripRequestXML: string | null

  public isEmbed: boolean

  public searchDate: Date
  public searchTime: string

  public headerText: string

  private useMocks: boolean

  constructor(
    private notificationToast: SbbNotificationToast,
    private tripXmlPopover: SbbDialog,
    private embedHTMLPopover: SbbDialog,
    private router: Router,
    public userTripService: UserTripService,
    public mapService: MapService
  ) {
    const searchDate = this.userTripService.departureDate
    this.searchDate = searchDate
    this.searchTime = OJP.DateHelpers.formatTimeHHMM(searchDate);

    this.fromLocationText = ''
    this.toLocationText = ''

    this.appStageOptions = ['PROD', 'INT', 'TEST', 'LA Beta']

    this.isSearching = false

    this.tripRequestFormattedXML = 'RequestXML'
    this.tripResponseFormattedXML = 'ResponseXML'
    this.requestDuration = null

    this.lastCustomTripRequestXML = null

    this.useMocks = false

    this.headerText = 'Search'
    
    this.isEmbed = this.router.url.indexOf('/embed/') !== -1;
  }

  ngOnInit() {
    this.userTripService.initDefaults();

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
      this.expandSearchPanel()
      this.requestDuration = null
    });

    this.userTripService.defaultsInited.subscribe(nothing => {
      const queryParams = new URLSearchParams(document.location.search);
      const doSearch = queryParams.get('do_search') ?? false;
      if (doSearch) {
        this.handleTapOnSearch();
      }
    });

    if (this.useMocks) {
      this.initLocationsFromMocks()
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

  private initLocationsFromMocks() {
    let mockBaseFolder = 'assets/mocks/ojp-trips-response/';

    let mockURL = 'n/a';
    
    mockURL = mockBaseFolder + 'on-demand-response.xml';

    const responsePromise = fetch(mockURL);

    console.log('USE MOCKS: ' + mockURL);

    responsePromise.then(response => {
      response.text().then(responseText => {
        const tripsResponse = new OJP.TripsResponse();
        tripsResponse.parseXML(responseText, (parseStatus, isComplete) => {
          if (!isComplete) {
            const totalTripsNo = tripsResponse.parserTripsNo;
            if (parseStatus === 'TripRequest.TripsNo') {
              console.log('TripsNo => ' + totalTripsNo);
            }

            if (parseStatus === 'TripRequest.Trip') {
              console.log('New Trip => ' + tripsResponse.trips.length + '/' + totalTripsNo);
              this.handleCustomTripResponse(tripsResponse);
            }
          }
        });
      });
    });
  }

  private zoomToTrip(trip: OJP.Trip) {
    const bbox = trip.computeBBOX();
    if (bbox.isValid() === false) {
      return;
    }

    const bounds = new mapboxgl.LngLatBounds(bbox.asFeatureBBOX())

    const mapData = {
      bounds: bounds,
    }
    this.mapService.newMapBoundsRequested.emit(mapData);
  }

  onLocationSelected(location: OJP.Location | null, originType: OJP.JourneyPointType) {
    this.userTripService.updateTripEndpoint(location, originType, 'SearchForm')
  }

  onChangeStageAPI(ev: SbbRadioChange) {
    const newAppStage = ev.value as APP_STAGE
    this.userTripService.updateAppStage(newAppStage)

    this.userTripService.refetchEndpointsByName();
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

  handleTapOnSearch() {
    this.userTripService.updateDepartureDateTime(this.computeFormDepartureDate())

    const journeyRequestParams = this.userTripService.computeJourneyRequestParams()
    if (journeyRequestParams === null) {
      this.notificationToast.open('Please check from/to input points', {
        type: 'error',
        verticalPosition: 'top',
      });
      return
    }

    if (this.userTripService.currentAppStage === 'LA Beta') {
      // https://github.com/openTdataCH/ojp-demo-app-src/issues/108#issuecomment-1620364322
      journeyRequestParams.useNumberOfResultsAfter = false
    }
    
    this.notificationToast.dismiss()

    const stageConfig = this.userTripService.getStageConfig()
    const journeyRequest = new OJP.JourneyRequest(stageConfig, journeyRequestParams)

    this.isSearching = true
    const startRequestDate = new Date();

    journeyRequest.fetchResponse((journeyResponse, isComplete, journeyResponseStatus, error) => {
      if (error) {
        this.notificationToast.open(error.message, {
          type: 'error',
          verticalPosition: 'top',
        })

        this.isSearching = false;
        this.userTripService.lastJourneyResponse = null;

        this.requestDuration = null;

        this.userTripService.updateTrips([]);

        return;
      }

      const trips = journeyResponse.sections.flatMap(el => el.response.trips);

      if (isComplete) {
        if (trips.length === 0) {
          this.notificationToast.open('No trips found', {
            type: 'info',
            verticalPosition: 'top',
          })
        }
        
        const endRequestDate = new Date();
        const requestDuration = ((endRequestDate.getTime() - startRequestDate.getTime()) / 1000).toFixed(2);
        this.requestDuration = requestDuration + ' sec';
  
        this.isSearching = false;
        this.userTripService.lastJourneyResponse = journeyRequest.lastJourneyResponse;
        this.userTripService.updateTrips(trips);

        if (trips.length > 0) {
          // it could be that the trips order changed, zoom again to the first one
          const firstTrip = trips[0];
          this.zoomToTrip(firstTrip);
        }
      } else {
        const totalTripsNo = journeyResponse.sections.reduce((acc, section) => acc + section.response.parserTripsNo, 0);
        if (journeyResponseStatus === 'TripRequest.Trip') {
          this.userTripService.updateTrips(trips);

          if (trips.length === 1) {
            // zoom to first trip
            const firstTrip = trips[0];
            this.zoomToTrip(firstTrip);
          }
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
      popover.inputTripRequestXmlS = this.userTripService.computeTripRequestXML(this.computeFormDepartureDate())

      popover.tripCustomRequestSaved.subscribe((tripsResponseXML) => {
        this.lastCustomTripRequestXML = popover.inputTripRequestXmlS

        const tripResponse = new OJP.TripsResponse();
        tripResponse.parseXML(tripsResponseXML, (message, isComplete) => {
          if (isComplete) {
            popover.inputTripRequestResponseXmlS = tripsResponseXML;

            dialogRef.close();
            this.handleCustomTripResponse(tripResponse);
          }
        });
      })

      popover.tripCustomResponseSaved.subscribe((tripsResponseXML) => {
        const tripModeType = this.userTripService.tripModeTypes[0];

        const tripResponse = new OJP.TripsResponse();
        tripResponse.parseXML(tripsResponseXML, (message, isComplete) => {
          if (isComplete) {
            popover.inputTripRequestResponseXmlS = tripsResponseXML;

            dialogRef.close();
            this.handleCustomTripResponse(tripResponse);
          }
        });
      })
    });
  }

  private handleCustomTripResponse(tripsResponse: OJP.TripsResponse) {
    this.requestDuration = 'USER XML';

    this.isSearching = false
    this.userTripService.lastJourneyResponse = null
    this.userTripService.updateTrips(tripsResponse.trips) 

    this.updateSearchForm(tripsResponse);

    const zoomToTrip = tripsResponse.trips.length === 1;
    if (zoomToTrip) {
      const firstTrip = tripsResponse.trips[0];
      this.zoomToTrip(firstTrip);
    }
  }

  private updateSearchForm(tripResponse: OJP.TripsResponse) {
    const firstTrip = tripResponse.trips[0]
    if (firstTrip === null) {
      return
    }

    this.userTripService.updateParamsFromTrip(firstTrip)
    this.updateLocationTexts()
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
