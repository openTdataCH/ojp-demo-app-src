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
};

const walkTransportMode: OJP.IndividualTransportMode = OJP.OJP_VERSION === '1.0' ? 'walk' : 'foot'; 
const carTransportMode: OJP.IndividualTransportMode = OJP.OJP_VERSION === '1.0' ? 'self-drive-car' : 'car';

const appTripTransportModeData: TripTransportModeData[] = [
  {
    modeType: 'monomodal',
    transportModes: [
      'public_transport',
      walkTransportMode,
      'cycle',
      carTransportMode,
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
      walkTransportMode,
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

  public tripTransportModes: OJP.IndividualTransportMode[]
  private prevTransportMode: OJP.IndividualTransportMode;

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
  public isNumberOfResultsBeforeEnabled: boolean;
  public isNumberOfResultsAfterEnabled: boolean;
  public numberOfResults: number;
  public numberOfResultsBefore: number;
  public numberOfResultsAfter: number;

  public mapPublicTransportModesFilter: Record<OJP.ModeOfTransportType, boolean>;

  public showMonoMultiModalSelect: boolean;

  constructor(public userTripService: UserTripService) {
    this.tripTransportModeData = appTripTransportModeData;

    this.tripTransportModes = JSON.parse(JSON.stringify(this.tripTransportModeData[0].transportModes))
    this.prevTransportMode = 'public_transport';

    this.isAdditionalRestrictionsEnabled = false;
    this.settingsCollapseID = 'mode_custom_mode_settings_NOT_READY_YET';
    
    this.filterMinDurationControl.setValue('2', { emitEvent: false });
    this.filterMaxDurationControl.setValue('30', { emitEvent: false });
    this.filterMinDistanceControl.setValue('100', { emitEvent: false });
    this.filterMaxDistanceControl.setValue('10000', { emitEvent: false });

    this.isFilterMinDurationEnabled = true;
    this.isFilterMaxDurationEnabled = true;
    this.isFilterMinDistanceEnabled = true;
    this.isFilterMaxDistanceEnabled = true;

    this.isNumberOfResultsEnabled = true;
    this.isNumberOfResultsBeforeEnabled = false;
    this.isNumberOfResultsAfterEnabled = false;
    this.numberOfResults = TRIP_REQUEST_DEFAULT_NUMBER_OF_RESULTS;
    this.numberOfResultsBefore = 1;
    this.numberOfResultsAfter = 4;

    this.mapPublicTransportModesFilter = <Record<OJP.ModeOfTransportType, boolean>>{};
    this.mapPublicTransportModesFilter.rail = false;
    this.mapPublicTransportModesFilter.bus = false;
    this.mapPublicTransportModesFilter.water = false;
    this.mapPublicTransportModesFilter.tram = false;

    this.showMonoMultiModalSelect = OJP.OJP_VERSION === '1.0';
  }

  ngOnInit() {
    const tripTransportModeData = this.tripTransportModeData.find(tripTransportMode => {
      return tripTransportMode.modeType === this.userTripService.tripModeType;
    }) ?? this.tripTransportModeData[0];

    this.tripTransportModes = JSON.parse(JSON.stringify(tripTransportModeData.transportModes));
    this.prevTransportMode = this.userTripService.tripTransportMode;

    this.userTripService.defaultsInited.subscribe(nothing => {
      this.userTripService.updateTripLocationCustomMode();

      const isMonomodal = this.userTripService.tripModeType === 'monomodal';

      if (!isMonomodal) {
        this.isAdditionalRestrictionsEnabled = true;
        this.updateAdditionalRestrictions();
      }

      const isAuto = this.userTripService.tripTransportMode === carTransportMode;
      if (isMonomodal && isAuto) {
        this.numberOfResults = 0;
        this.userTripService.numberOfResults = 0;
      }

      if (this.userTripService.publicTransportModesFilter.length > 0) {
        this.isAdditionalRestrictionsEnabled = true;

        this.userTripService.publicTransportModesFilter.forEach(userPublicTransportMode => {
          if (userPublicTransportMode === 'bus') {
            this.mapPublicTransportModesFilter.bus = true;
          }
          if (userPublicTransportMode === 'rail') {
            this.mapPublicTransportModesFilter.rail = true;
          }
          if (userPublicTransportMode === 'water') {
            this.mapPublicTransportModesFilter.water = true;
          }
          if (userPublicTransportMode === 'tram') {
            this.mapPublicTransportModesFilter.tram = true;
          }
        });
      }

      this.userTripService.searchFormAfterDefaultsInited.emit();
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

    this.settingsCollapseID = 'mode_custom_mode_settings_0';
  }

  public updateAdditionalRestrictions() {
    let minDuration = null;
    let maxDuration = null;
    let minDistance = null;
    let maxDistance = null;
    
    let numberOfResults: number | null = TRIP_REQUEST_DEFAULT_NUMBER_OF_RESULTS;
    let numberOfResultsBefore: number | null = null;
    let numberOfResultsAfter: number | null = null;
    
    this.userTripService.publicTransportModesFilter = [];

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

      if (this.isNumberOfResultsEnabled) {
        numberOfResults = this.numberOfResults;
      } else {
        numberOfResults = null;
      }

      if (this.isNumberOfResultsBeforeEnabled) {
        numberOfResultsBefore = this.numberOfResultsBefore;
      }
      if (this.isNumberOfResultsAfterEnabled) {
        numberOfResultsAfter = this.numberOfResultsAfter;
      }

      const availablePublicTransportModesFilter: OJP.ModeOfTransportType[] = ['bus', 'tram', 'rail', 'water'];
      availablePublicTransportModesFilter.forEach(modeFilter => {
        if (this.mapPublicTransportModesFilter[modeFilter] === true) {
          this.userTripService.publicTransportModesFilter.push(modeFilter);
        }
      });
    }

    this.userTripService.updateTripLocationRestrictions(minDuration, maxDuration, minDistance, maxDistance);
    this.userTripService.numberOfResults = numberOfResults;
    this.userTripService.numberOfResultsAfter = numberOfResultsAfter;
    this.userTripService.numberOfResultsBefore = numberOfResultsBefore;

    this.userTripService.updateURLs();
  }

  public onTripModeChange() {
    const tripModeType = this.userTripService.tripModeType;

    const tripTransportModeData = this.tripTransportModeData.find(tripTransportMode => {
      return tripTransportMode.modeType === tripModeType;
    }) ?? null;

    if (tripTransportModeData === null) {
      return;
    }
    
    if (tripModeType !== 'monomodal') {
      if (!this.isAdditionalRestrictionsEnabled) {
        this.isAdditionalRestrictionsEnabled = true;
      }

      this.updateAdditionalRestrictions();
    }

    this.tripTransportModes = JSON.parse(JSON.stringify(tripTransportModeData.transportModes));
    
    // Preserve the transport mode when switching the trip mode
    const hasTransportMode = this.tripTransportModes.indexOf(this.userTripService.tripTransportMode) !== -1;
    if (!hasTransportMode) {
      this.userTripService.tripTransportMode = this.tripTransportModes[0];
    }

    this.userTripService.updateTripMode();
    this.userTripService.updateTripLocationCustomMode();
  }

  public onTransportModeChange() {
    const isCar = this.userTripService.tripTransportMode === carTransportMode;
    if (isCar) {
      this.numberOfResults = 0;
      this.userTripService.numberOfResults = 0;
    }

    if (this.prevTransportMode === carTransportMode && !isCar) {
      this.numberOfResults = TRIP_REQUEST_DEFAULT_NUMBER_OF_RESULTS;
      this.userTripService.numberOfResults = TRIP_REQUEST_DEFAULT_NUMBER_OF_RESULTS;
    }

    this.userTripService.updateTripMode();
    this.userTripService.updateTripLocationCustomMode();

    this.prevTransportMode = this.userTripService.tripTransportMode;
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
