import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { UserTripService } from '../shared/services/user-trip.service'

import { SbbRadioChange } from '@sbb-esta/angular-core/radio-button';
import { SbbDialog } from '@sbb-esta/angular-business/dialog';

import * as OJP from '../shared/ojp-sdk/index'

import { UserSettingsService } from '../shared/services/user-settings.service';

type SearchState = 'ChooseEndpoints' | 'DisplayTrips'

@Component({
  selector: 'app-search-form',
  templateUrl: './search-form.component.html',
  styleUrls: ['./search-form.component.scss']
})
export class SearchFormComponent implements OnInit {
  formGroup: FormGroup

  searchState: SearchState = 'ChooseEndpoints'

  private tripRequestParams: OJP.TripsRequestParams | null

  public fromLocationText: string
  public toLocationText: string

  public currentAppStage: OJP.APP_Stage = 'PROD'
  public appStageOptions: OJP.APP_Stage[] = []

  public isSearching: boolean

  public tripRequestFormattedXML: string
  public tripResponseFormattedXML: string
  public requestDuration: string | null

  @ViewChild('debugXMLPopoverTemplate', { static: true }) debugXMLPopoverTemplate: TemplateRef<any> | undefined;

  constructor(private userTripService: UserTripService, private userSettingsService: UserSettingsService, public dialog: SbbDialog) {
    const nowDate = new Date()
    const timeFormatted = OJP.DateHelpers.formatTimeHHMM(nowDate);

    this.formGroup = new FormGroup({
      date: new FormControl(nowDate),
      time: new FormControl(timeFormatted)
    })

    this.tripRequestParams = null;

    this.fromLocationText = ''
    this.toLocationText = ''

    this.currentAppStage = this.userSettingsService.appStage
    this.appStageOptions = Object.keys(OJP.APP_Stages) as OJP.APP_Stage[];

    this.isSearching = false

    this.tripRequestFormattedXML = 'RequestXML'
    this.tripResponseFormattedXML = 'ResponseXML'
    this.requestDuration = null
  }

  ngOnInit() {
    this.initLocations()
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
        } else {
          this.toLocationText = locationFormText
        }

        this.updateSearchParamsDate();
      }
    });
  }

  isChoosingEndpoints(): boolean {
    return this.searchState === 'ChooseEndpoints'
  }

  private initLocations() {
    const defaultLocationsPlaceRef = {
      "Bern": "8507000",
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
    this.updateSearchParamsDate()
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

  private updateSearchParamsDate() {
    const departureDate = this.computeFormDepartureDate();

    this.tripRequestParams = OJP.TripsRequestParams.initWithLocationsAndDate(
      this.userTripService.fromLocation,
      this.userTripService.toLocation,
      departureDate
    );

    this.updateDebugXML();
  }

  private updateDebugXML() {
    if (this.tripRequestParams === null) {
      return
    }

    const stageConfig = this.userSettingsService.getStageConfig()
    const tripRequest = new OJP.TripRequest(stageConfig, this.tripRequestParams);

    this.tripRequestFormattedXML = tripRequest.computeRequestXML();
    this.tripResponseFormattedXML = ''
    this.requestDuration = null
  }

  shouldDisableSearchButton(): boolean {
    if (this.isSearching) {
      return true
    }

    return this.tripRequestParams === null
  }

  handleTapOnSearch() {
    const stageConfig = this.userSettingsService.getStageConfig()

    if (this.tripRequestParams === null) {
      return
    }

    this.updateSearchParamsDate();
    this.isSearching = true

    const startRequestDate = new Date();

    const tripRequest = new OJP.TripRequest(stageConfig, this.tripRequestParams);
    tripRequest.fetchResponse(tripsResponse => {
      const endRequestDate = new Date();
      const requestDuration = ((endRequestDate.getTime() - startRequestDate.getTime()) / 1000).toFixed(2);
      this.requestDuration = requestDuration + ' sec';

      this.isSearching = false
      this.userTripService.updateTrips(tripsResponse.trips)

      this.tripResponseFormattedXML = tripsResponse.responseXMLText
    });
  }

  openRequestLogDialog() {
    if (this.debugXMLPopoverTemplate) {
      const dialogRef = this.dialog.open(this.debugXMLPopoverTemplate);
    }
  }
}
