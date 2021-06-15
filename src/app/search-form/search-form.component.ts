import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { UserTripService } from '../shared/services/user-trip.service'

import * as OJP from '../shared/ojp-sdk/index'
import { SbbRadioChange } from '@sbb-esta/angular-core/radio-button';
import { UserSettingsService } from '../shared/services/user-settings.service';

@Component({
  selector: 'app-search-form',
  templateUrl: './search-form.component.html',
})
export class SearchFormComponent implements OnInit {
  formGroup: FormGroup

  @Output() tripsResponseCompleted = new EventEmitter<OJP.TripsResponse>();

  private tripRequestParams: OJP.TripsRequestParams | null

  public fromLocationText: string
  public toLocationText: string

  public currentAppStage: OJP.APP_Stage = 'PROD'
  public appStageOptions: OJP.APP_Stage[] = []

  constructor(private userTripService: UserTripService, private userSettingsService: UserSettingsService) {
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
  }

  ngOnInit() {
    this.initLocations()

    this.userTripService.locationUpdated.subscribe(locationData => {
      if (
        (locationData.updateSource === 'MapDragend')
        || (locationData.updateSource === 'MapPopupClick')
      ) {
        const geoPosition = locationData.location?.geoPosition ?? null;
        if (geoPosition === null) {
          return
        }

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

        this.updateSearchParams();
      }
    });
  }

  private initLocations() {
    const defaultLocationsPlaceRef = {
      "Bern": "8507000",
      "Zurich": "8503000",
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

      const stageConfig = this.userSettingsService.getStageConfig();
      const locationInformationRequest = OJP.LocationInformationRequest.initWithStopPlaceRef(stageConfig, stopPlaceRef)
      const locationInformationPromise = locationInformationRequest.fetchResponse();
      promises.push(locationInformationPromise)
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
    this.updateSearchParams()
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

  updateSearchParams() {
    const departureDate = this.computeFormDepartureDate();
    this.tripRequestParams = OJP.TripsRequestParams.initWithLocationsAndDate(
      this.userTripService.fromLocation,
      this.userTripService.toLocation,
      departureDate
    );
  }

  hasInvalidSearchParams(): boolean {
    return this.tripRequestParams === null
  }

  handleTapOnSearch() {
    const stageConfig = this.userSettingsService.getStageConfig()

    if (this.tripRequestParams === null) {
      return
    }

    this.updateSearchParams();

    const tripRequest = new OJP.TripRequest(stageConfig, this.tripRequestParams);
    tripRequest.fetchResponse(tripsResponse => {
      this.tripsResponseCompleted.emit(tripsResponse);
    });
  }
}
