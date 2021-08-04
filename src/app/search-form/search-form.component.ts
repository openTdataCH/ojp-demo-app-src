import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

import { UserTripService } from '../shared/services/user-trip.service'
import { InputXmlPopoverComponent } from './input-xml-popover/input-xml-popover.component';

import { SbbDialog } from "@sbb-esta/angular-business/dialog";
import { SbbExpansionPanel } from '@sbb-esta/angular-business/accordion';
import { SbbNotificationToast } from '@sbb-esta/angular-business/notification-toast';
import { SbbRadioChange } from '@sbb-esta/angular-core/radio-button';

import * as OJP from '../shared/ojp-sdk/index'

@Component({
  selector: 'app-search-form',
  templateUrl: './search-form.component.html',
  styleUrls: ['./search-form.component.scss']
})
export class SearchFormComponent implements OnInit {
  @ViewChild(SbbExpansionPanel, { static: true }) searchPanel: SbbExpansionPanel | undefined;

  formGroup: FormGroup

  public fromLocationText: string
  public toLocationText: string

  public appStageOptions: OJP.APP_Stage[] = []

  public isSearching: boolean

  public tripRequestFormattedXML: string
  public tripResponseFormattedXML: string
  public requestDuration: string | null

  private lastCustomTripRequestXML: string | null

  private useMocks: boolean

  constructor(
    private notificationToast: SbbNotificationToast,
    private tripXmlPopover: SbbDialog,
    public userTripService: UserTripService
  ) {
    const searchDate = this.userTripService.departureDate
    const timeFormatted = OJP.DateHelpers.formatTimeHHMM(searchDate);

    this.formGroup = new FormGroup({
      date: new FormControl(searchDate),
      time: new FormControl(timeFormatted)
    })

    this.fromLocationText = ''
    this.toLocationText = ''

    this.appStageOptions = ['PROD', 'TEST', 'TEST LA']

    this.isSearching = false

    this.tripRequestFormattedXML = 'RequestXML'
    this.tripResponseFormattedXML = 'ResponseXML'
    this.requestDuration = null

    this.lastCustomTripRequestXML = null

    this.useMocks = false

  }

  ngOnInit() {
    this.userTripService.locationsUpdated.subscribe(nothing => {
      this.updateLocationTexts()
      this.expandSearchPanel()
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

  }

  private updateLocationTexts() {
    const endpointTypes: OJP.JourneyPointType[] = ['From', 'To'];
    endpointTypes.forEach(endpointType => {
      const location = endpointType === 'From' ? this.userTripService.fromLocation : this.userTripService.toLocation

      let locationText: string = ''
      if (location) {
        const stopPlaceName = location.stopPlace?.stopPlaceName ?? null
        if (stopPlaceName) {
          locationText = stopPlaceName
        } else {
          locationText = location.geoPosition?.asLatLngString() ?? ''
        }
      }

      if (endpointType === 'From') {
        this.fromLocationText = locationText
      } else {
        this.toLocationText = locationText
      }
    })
  }

  private initLocationsFromMocks() {
    const mockURL = 'assets/mocks/on-demand-response.xml'
    const responsePromise = fetch(mockURL);

    console.log('USE MOCKS: ' + mockURL);

    responsePromise.then(response => {
      response.text().then(responseText => {
        const tripsResponse = OJP.TripsResponse.initWithXML(responseText, 'Default');
        this.requestDuration = 'LOCAL MOCK';

        console.log('MOCK RESPONSE');
        console.log(tripsResponse);

        this.userTripService.updateTrips(tripsResponse.trips)
        this.tripResponseFormattedXML = tripsResponse.responseXMLText
      });
    });
  }

  onLocationSelected(location: OJP.Location, originType: OJP.JourneyPointType) {
    this.userTripService.updateTripEndpoint(location, originType, 'SearchForm')
  }

  onChangeStageAPI(ev: SbbRadioChange) {
    const newAppStage = ev.value as OJP.APP_Stage
    this.userTripService.updateAppStage(newAppStage)
  }

  onChangeDateTime() {
    this.userTripService.updateDepartureDateTime(this.computeFormDepartureDate())
  }

  private computeFormDepartureDate(): Date {
    const departureDate = this.formGroup.controls['date'].value as Date;
    const timeParts = this.formGroup.controls['time'].value.split(':');
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
      console.error('Whooops, JourneyRequestParams cant be null');
      return
    }

    this.notificationToast.dismiss()

    const stageConfig = this.userTripService.getStageConfig()
    const journeyRequest = new OJP.JourneyRequest(stageConfig, journeyRequestParams)

    this.isSearching = true
    const startRequestDate = new Date();
    journeyRequest.fetchResponse((trips, error) => {
      if (error) {
        this.notificationToast.open(error.message, {
          type: 'error',
          verticalPosition: 'top',
        })

        this.isSearching = false
        this.userTripService.lastJourneyResponse = null

        this.requestDuration = null;

        this.userTripService.updateTrips([])

        return
      }

      if (trips.length === 0) {
        this.notificationToast.open('No trips found', {
          type: 'info',
          verticalPosition: 'top',
        })
      }

      const endRequestDate = new Date();
      const requestDuration = ((endRequestDate.getTime() - startRequestDate.getTime()) / 1000).toFixed(2);
      this.requestDuration = requestDuration + ' sec';

      this.isSearching = false
      this.userTripService.lastJourneyResponse = journeyRequest.lastJourneyResponse
      this.userTripService.updateTrips(trips)
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
      height: '40rem',
      position: { top: '20px' },
    });
    dialogRef.afterOpen().subscribe(() => {
      const popover = dialogRef.componentInstance as InputXmlPopoverComponent
      popover.inputTripRequestXmlS = this.userTripService.computeTripRequestXML(this.computeFormDepartureDate())

      popover.tripCustomRequestSaved.subscribe((tripsResponseXML) => {
        this.lastCustomTripRequestXML = popover.inputTripRequestXmlS

        const tripResponse = OJP.TripsResponse.initWithXML(tripsResponseXML, 'Default')
        if (tripResponse.trips.length === 0) {
          popover.inputTripRequestResponseXmlS = tripsResponseXML
          return
        }

        dialogRef.close()
        this.handleCustomTripResponse(tripResponse)
      })

      popover.tripCustomResponseSaved.subscribe((tripsResponseXML) => {
        const tripResponse = OJP.TripsResponse.initWithXML(tripsResponseXML, 'Default')
        if (tripResponse.trips.length === 0) {
          return
        }

        dialogRef.close()
        this.handleCustomTripResponse(tripResponse)
      })
    });
  }

  private handleCustomTripResponse(tripResponse: OJP.TripsResponse) {
    this.requestDuration = 'USER XML';

    this.isSearching = false
    this.userTripService.lastJourneyResponse = null
    this.userTripService.updateTrips(tripResponse.trips) 

    this.collapseSearchPanel()
    this.updateSearchForm(tripResponse)
  }

  private updateSearchForm(tripResponse: OJP.TripsResponse) {
    const firstTrip = tripResponse.trips[0]
    if (firstTrip === null) {
      return
    }

    this.userTripService.updateParamsFromTrip(firstTrip)
    this.updateLocationTexts()
  }
}
