import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { UserTripService } from '../shared/services/user-trip.service'

import { SbbExpansionPanel } from '@sbb-esta/angular-business/accordion';
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

  private useMocks: boolean

  constructor(
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

    this.appStageOptions = Object.keys(OJP.APP_Stages) as OJP.APP_Stage[];

    this.isSearching = false

    this.tripRequestFormattedXML = 'RequestXML'
    this.tripResponseFormattedXML = 'ResponseXML'
    this.requestDuration = null

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

    const stageConfig = this.userTripService.getStageConfig()
    const journeyRequest = new OJP.JourneyRequest(stageConfig, journeyRequestParams)

    this.isSearching = true
    const startRequestDate = new Date();
    journeyRequest.fetchResponse(trips => {
      const endRequestDate = new Date();
      const requestDuration = ((endRequestDate.getTime() - startRequestDate.getTime()) / 1000).toFixed(2);
      this.requestDuration = requestDuration + ' sec';

      this.isSearching = false
      this.userTripService.updateTrips(trips)
      this.userTripService.lastJourneyResponse = journeyRequest.lastJourneyResponse
    })
  }

  private expandSearchPanel() {
    this.searchPanel?.open()
  }

  private collapseSearchPanel() {
    this.searchPanel?.close()
  }
}
