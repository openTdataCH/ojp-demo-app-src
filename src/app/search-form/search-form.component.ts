import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { UserTripService } from '../shared/services/user-trip.service'

import { SbbRadioChange } from '@sbb-esta/angular-core/radio-button';
import { SbbDialog } from '@sbb-esta/angular-business/dialog';

import * as OJP from '../shared/ojp-sdk/index'

import { UserSettingsService } from '../shared/services/user-settings.service';

import 'url-search-params-polyfill';

type SearchState = 'ChooseEndpoints' | 'DisplayTrips'

@Component({
  selector: 'app-search-form',
  templateUrl: './search-form.component.html',
  styleUrls: ['./search-form.component.scss']
})
export class SearchFormComponent implements OnInit {
  private queryParams: URLSearchParams

  formGroup: FormGroup

  searchState: SearchState = 'ChooseEndpoints'

  public fromLocationText: string
  public toLocationText: string

  public currentAppStage: OJP.APP_Stage = 'PROD'
  public appStageOptions: OJP.APP_Stage[] = []

  public isSearching: boolean

  public tripRequestFormattedXML: string
  public tripResponseFormattedXML: string
  public requestDuration: string | null

  private useMocks: boolean

  @ViewChild('debugXMLPopoverTemplate', { static: true }) debugXMLPopoverTemplate: TemplateRef<any> | undefined;

  constructor(public userTripService: UserTripService, private userSettingsService: UserSettingsService, public dialog: SbbDialog) {
    const nowDate = new Date()
    const timeFormatted = OJP.DateHelpers.formatTimeHHMM(nowDate);
    this.queryParams = new URLSearchParams(location.search)

    const searchDate = this.computeInitialDate()
    const timeFormatted = OJP.DateHelpers.formatTimeHHMM(searchDate);

    this.formGroup = new FormGroup({
      date: new FormControl(searchDate),
      time: new FormControl(timeFormatted)
    })

    this.fromLocationText = ''
    this.toLocationText = ''

    this.currentAppStage = this.userSettingsService.appStage
    this.appStageOptions = Object.keys(OJP.APP_Stages) as OJP.APP_Stage[];

    this.isSearching = false

    this.tripRequestFormattedXML = 'RequestXML'
    this.tripResponseFormattedXML = 'ResponseXML'
    this.requestDuration = null

    this.useMocks = false

  private computeInitialDate(): Date {
    const defaultDate = new Date()

    const tripDateTimeS = this.queryParams.get('trip_datetime') ?? null
    if (tripDateTimeS === null) {
      return defaultDate
    }

    const tripDateTime = new Date(Date.parse(tripDateTimeS))
    return tripDateTime
  }

  ngOnInit() {
    if (this.useMocks) {
      this.initLocationsFromMocks()
    } else {
      this.initLocations()
    }

    this.userTripService.tripsUpdated.subscribe(trips => {
      if (trips.length > 0) {
        this.searchState = 'DisplayTrips'
      }
    });

    this.userTripService.locationUpdated.subscribe(locationData => {
      if (
        (locationData.updateSource === 'MapDragend')
        || (locationData.updateSource === 'MapPopupClick')
      ) {
        const geoPosition = locationData.location?.geoPosition ?? null;
        if (geoPosition === null) {
          return
        }

        this.searchState = 'ChooseEndpoints'

        let locationFormText = geoPosition.asLatLngString()

        const stopPlaceName = locationData.location?.stopPlace?.stopPlaceName ?? null
        if (stopPlaceName) {
          locationFormText = stopPlaceName
        }

        if (locationData.endpointType === 'From') {
          this.fromLocationText = locationFormText
        }

        if (locationData.endpointType === 'To') {
          this.toLocationText = locationFormText
        }
      }
    });

    this.userTripService.viaAtIndexRemoved.subscribe(idx => {
      this.searchState = 'ChooseEndpoints'
      this.requestDuration = null
    })

    this.userTripService.viaAtIndexUpdated.subscribe(viaData => {
      this.searchState = 'ChooseEndpoints'
      this.requestDuration = null
    })
  }

  private initLocationsFromMocks() {
    const mockURL = 'assets/mocks/on-demand-response.xml'
    const responsePromise = fetch(mockURL);

    console.log('USE MOCKS: ' + mockURL);

    responsePromise.then(response => {
      response.text().then(responseText => {
        const tripsResponse = OJP.TripsResponse.initWithXML(responseText);
        this.requestDuration = 'LOCAL MOCK';

        console.log('MOCK RESPONSE');
        console.log(tripsResponse);

        this.userTripService.updateTrips(tripsResponse.trips)
        this.tripResponseFormattedXML = tripsResponse.responseXMLText
      });
    });
  }

  isChoosingEndpoints(): boolean {
    return this.searchState === 'ChooseEndpoints'
  }

  private initLocations() {
    const defaultLocationsPlaceRef = {
      "Bern": "8507000",
      "Geneva": "8501008",
      "Gurten": "8507099",
      "St. Gallen": "8506302",
      "Uetliberg": "8503057",
      "Zurich": "8503000",
      "DemandLegFrom": "46.674360,6.460966",
      "DemandLegTo": "46.310963,7.977509",
    }
    const fromPlaceRef = defaultLocationsPlaceRef.Bern
    const toPlaceRef = defaultLocationsPlaceRef.Zurich

    const promises: Promise<OJP.Location[]>[] = [];

    const endpointTypes: OJP.JourneyPointType[] = ['From', 'To']
    endpointTypes.forEach(endpointType => {
      const isFrom = endpointType === 'From'

      const stopPlaceRef = isFrom ? fromPlaceRef : toPlaceRef
      if (isFrom) {
        this.fromLocationText = stopPlaceRef
      } else {
        this.toLocationText = stopPlaceRef
      }

      const coordsLocation = OJP.Location.initFromLiteralCoords(stopPlaceRef);
      if (coordsLocation) {
        const coordsPromise = new Promise<OJP.Location[]>((resolve, reject) => {
          resolve([coordsLocation]);
        });
        promises.push(coordsPromise);
      } else {
        const stageConfig = this.userSettingsService.getStageConfig();
        const locationInformationRequest = OJP.LocationInformationRequest.initWithStopPlaceRef(stageConfig, stopPlaceRef)
        const locationInformationPromise = locationInformationRequest.fetchResponse();
        promises.push(locationInformationPromise)
      }
    });

    Promise.all(promises).then(locationsData => {
      endpointTypes.forEach(endpointType => {
        const isFrom = endpointType === 'From'
        const locations = isFrom ? locationsData[0] : locationsData[1];
        if (locations.length === 0) {
          return;
        }

        const location = locations[0]
        const locationName = location.stopPlace?.stopPlaceName ?? null;
        if (locationName) {
          if (isFrom) {
            this.fromLocationText = locationName
          } else {
            this.toLocationText = locationName
          }
        }

        this.onLocationSelected(location, endpointType);
      });
    });
  }

  onLocationSelected(location: OJP.Location, originType: OJP.JourneyPointType) {
    this.userTripService.updateTripEndpoint(location, originType, 'SearchForm')
  }

  onChangeStageAPI(ev: SbbRadioChange) {
    const newAppStage = ev.value as OJP.APP_Stage

    this.currentAppStage = newAppStage
    this.userSettingsService.appStage = newAppStage
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
    const departureDate = this.computeFormDepartureDate();
    const journeyRequestParams = this.userTripService.computeJourneyRequestParams(departureDate)
    if (journeyRequestParams === null) {
      console.error('Whooops, JourneyRequestParams cant be null');
      return
    }

    const stageConfig = this.userSettingsService.getStageConfig()
    const journeyRequest = new OJP.JourneyRequest(stageConfig, journeyRequestParams)

    this.isSearching = true
    const startRequestDate = new Date();
    journeyRequest.fetchResponse(trips => {
      const endRequestDate = new Date();
      const requestDuration = ((endRequestDate.getTime() - startRequestDate.getTime()) / 1000).toFixed(2);
      this.requestDuration = requestDuration + ' sec';

      this.isSearching = false
      this.userTripService.updateTrips(trips)
    })
  }

  openRequestLogDialog() {
    if (this.debugXMLPopoverTemplate) {
      const dialogRef = this.dialog.open(this.debugXMLPopoverTemplate);
    }
  }
}
