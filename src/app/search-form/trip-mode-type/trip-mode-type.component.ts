import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { debounceTime } from 'rxjs';

import * as OJP from 'ojp-sdk'

import { UserTripService } from '../../shared/services/user-trip.service';
import { FormatHelpers } from '../../helpers/format-helpers';
import { TRIP_REQUEST_DEFAULT_NUMBER_OF_RESULTS } from '../../config/app-config';

interface TripTransportModeData {
  modeType: OJP.TripModeType,
  transportModes: OJP.IndividualTransportMode[],
}

const appTripTransportModeData: TripTransportModeData[] = [
  {
    modeType: 'monomodal',
    transportModes: [
      'public_transport',
      'walk', // in v2 is 'foot',
      'cycle',
      'self-drive-car',
      'bicycle_rental',
      'escooter_rental',
      'car_sharing',
      'taxi',
      'others-drive-car',
    ]
  },
  {
    modeType: 'mode_at_start',
    transportModes: [
      'walk', // in v2 is 'foot',
      'cycle',
      'bicycle_rental',
      'escooter_rental',
      'taxi',
      'others-drive-car',
    ]
  },
  {
    modeType: 'mode_at_end',
    transportModes: [
      'walk', // in v2 is 'foot',
      'bicycle_rental',
      'escooter_rental',
      'car_sharing',
      'taxi',
      'others-drive-car',
    ]
  },
  {
    modeType: 'mode_at_start_end',
    transportModes: [
      'walk', // in v2 is 'foot',
      'bicycle_rental',
      'escooter_rental'
    ]
  }
];

@Component({
  selector: 'trip-mode-type',
  templateUrl: './trip-mode-type.component.html',
  styleUrls: ['./trip-mode-type.component.scss']
})
export class TripModeTypeComponent implements OnInit {
  public tripTransportModeData: TripTransportModeData[]

  public tripModeType: OJP.TripModeType
  public tripTransportModes: OJP.IndividualTransportMode[]
  public tripTransportMode: OJP.IndividualTransportMode

  public isAdditionalRestrictionsEnabled: boolean
  public settingsCollapseID: string

  public filterMinDurationControl = new FormControl('');
  public filterMaxDurationControl = new FormControl('');
  public filterMinDistanceControl = new FormControl('');
  public filterMaxDistanceControl = new FormControl('');

  public isFilterMinDurationEnabled;
  public isFilterMaxDurationEnabled;
  public isFilterMinDistanceEnabled;
  public isFilterMaxDistanceEnabled;

  public isNumberOfResultsEnabled: boolean;
  public numberOfResults: number;

  constructor(public userTripService: UserTripService) {
    this.tripTransportModeData = appTripTransportModeData;

    this.tripModeType = this.tripTransportModeData[0].modeType
    this.tripTransportModes = JSON.parse(JSON.stringify(this.tripTransportModeData[0].transportModes))
    this.tripTransportMode = this.tripTransportModes[0]

    this.isAdditionalRestrictionsEnabled = false;
    this.settingsCollapseID = 'mode_custom_mode_settings_NOT_READY_YET';
    
    this.filterMinDurationControl.setValue('2', { emitEvent: false });
    this.filterMaxDurationControl.setValue('30', { emitEvent: false });
    this.filterMinDistanceControl.setValue('100', { emitEvent: false });
    this.filterMaxDistanceControl.setValue('10000', { emitEvent: false });

    this.isFilterMinDurationEnabled = false;
    this.isFilterMaxDurationEnabled = true;
    this.isFilterMinDistanceEnabled = false;
    this.isFilterMaxDistanceEnabled = true;

    this.isNumberOfResultsEnabled = true;
    this.numberOfResults = TRIP_REQUEST_DEFAULT_NUMBER_OF_RESULTS;
  }

  ngOnInit() {
    // TODO - remove this, we used to have multiple TR
    const tripModeTypeIdx = 0;
    this.tripModeType = this.userTripService.tripModeTypes[tripModeTypeIdx];

    const tripTransportModeData = this.tripTransportModeData.find(tripTransportMode => {
      return tripTransportMode.modeType === this.tripModeType;
    }) ?? this.tripTransportModeData[0];

    this.tripTransportModes = JSON.parse(JSON.stringify(tripTransportModeData.transportModes));
    this.tripTransportMode = this.userTripService.tripTransportModes[tripModeTypeIdx];

    this.userTripService.defaultsInited.subscribe(nothing => {
      this.userTripService.updateTripLocationCustomMode();
    });

    this.filterMinDurationControl.valueChanges.pipe(debounceTime(200)).subscribe(value => {
      this.updateAdditionalRestrictions();
    });
    this.filterMaxDurationControl.valueChanges.pipe(debounceTime(200)).subscribe(value => {
      this.updateAdditionalRestrictions();
    });
    this.filterMinDistanceControl.valueChanges.pipe(debounceTime(200)).subscribe(value => {
      this.updateAdditionalRestrictions();
    });
    this.filterMaxDistanceControl.valueChanges.pipe(debounceTime(200)).subscribe(value => {
      this.updateAdditionalRestrictions();
    });

    this.settingsCollapseID = 'mode_custom_mode_settings_' + tripModeTypeIdx;
  }

  public updateAdditionalRestrictions() {
    let minDuration = null;
    let maxDuration = null;
    let minDistance = null;
    let maxDistance = null;
    let numberOfResults = TRIP_REQUEST_DEFAULT_NUMBER_OF_RESULTS;

    if (this.isAdditionalRestrictionsEnabled) {
      if (this.isFilterMinDurationEnabled) {
        minDuration = FormatHelpers.parseNumber(this.filterMinDurationControl.value);
      }
      if (this.isFilterMaxDurationEnabled) {
        maxDuration = FormatHelpers.parseNumber(this.filterMaxDurationControl.value);
      }
      if (this.isFilterMinDistanceEnabled) {
        minDistance = FormatHelpers.parseNumber(this.filterMinDistanceControl.value);
      }
      if (this.isFilterMaxDistanceEnabled) {
        maxDistance = FormatHelpers.parseNumber(this.filterMaxDistanceControl.value);
      }

      numberOfResults = this.numberOfResults;
    }

    this.userTripService.updateTripLocationRestrictions(minDuration, maxDuration, minDistance, maxDistance);
    this.userTripService.numberOfResults = numberOfResults;
  }

  public onTripModeChange() {
    const tripTransportModeData = this.tripTransportModeData.find(tripTransportMode => {
      return tripTransportMode.modeType === this.tripModeType;
    }) ?? null;

    if (tripTransportModeData === null) {
      return;
    }

    this.tripTransportModes = JSON.parse(JSON.stringify(tripTransportModeData.transportModes));
    
    // Preserve the transport mode when switching the trip mode
    const hasTransportMode = this.tripTransportModes.indexOf(this.tripTransportMode) !== -1;
    if (!hasTransportMode) {
      this.tripTransportMode = this.tripTransportModes[0];
    }

    this.userTripService.updateTripMode(this.tripModeType, this.tripTransportMode);
    this.userTripService.updateTripLocationCustomMode();
  }

  public onTransportModeChange() {
    this.userTripService.updateTripMode(this.tripModeType, this.tripTransportMode);
    this.userTripService.updateTripLocationCustomMode();
  }

  public computeTripModeTypeText(tripModeType: OJP.TripModeType): string {
    const MapTripMotType: Record<OJP.TripModeType, string> = {
      monomodal: 'Monomodal',
      mode_at_start: 'Mode at Start',
      mode_at_end: 'Mode at End',
      mode_at_start_end: 'Mode at Start & End'
    }

    const text = MapTripMotType[tripModeType] ?? 'n/a';
    return text;
  }

  public computeTripTransportModeText(transportMode: OJP.IndividualTransportMode): string {
    const MapIndividualTransportMode: Record<OJP.IndividualTransportMode, string> = {
      public_transport: 'Public Transport',
      walk: 'Walking',
      cycle: 'Own Bicycle',
      escooter_rental: 'eScooter Sharing',
      car_sharing: 'Car Sharing',
      "self-drive-car": 'Own Car',
      bicycle_rental: 'Bicycle Sharing',
      charging_station: 'Charging Stations',
      taxi: 'Taxi',
      'others-drive-car': 'Limousine',
      'car-shuttle-train': 'Autoverlad',
      'car': 'Car',
      'car-ferry': 'Ferry',
      'foot': 'Foot (walking)',
    }

    const text = MapIndividualTransportMode[transportMode] ?? 'n/a';
    
    return text;
  }

  public toggleAdditionalRestrictions() {
    this.isAdditionalRestrictionsEnabled = !this.isAdditionalRestrictionsEnabled;

    this.updateAdditionalRestrictions();
  }
}
