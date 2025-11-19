import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { debounceTime } from 'rxjs';

import * as OJP_SharedTypes from 'ojp-shared-types';
import OJP_Legacy from '../../config/ojp-legacy';

import { UserTripService } from '../../shared/services/user-trip.service';
import { LanguageService } from '../../shared/services/language.service';
import { FormatHelpers } from '../../helpers/format-helpers';

import { TRIP_REQUEST_DEFAULT_NUMBER_OF_RESULTS, OJP_VERSION } from '../../config/constants';

interface TripTransportModeData {
  modeType: OJP_Legacy.TripModeType,
  transportModes: OJP_Legacy.IndividualTransportMode[],
};

const isOJPv2 = OJP_VERSION === '2.0';

const walkTransportMode: OJP_Legacy.IndividualTransportMode = isOJPv2 ? 'foot' : 'walk'; 
const carTransportMode: OJP_Legacy.IndividualTransportMode = isOJPv2 ? 'car' : 'self-drive-car';

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
      walkTransportMode,
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
      walkTransportMode,
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
  public tripTransportModeData: TripTransportModeData[];

  public tripTransportModes: OJP_Legacy.IndividualTransportMode[];
  private prevTransportMode: OJP_Legacy.IndividualTransportMode;

  public settingsCollapseID: string;

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
  public walkSpeedDeviation: number;
  public walkSpeedDeviationValues: number[];

  public mapPublicTransportModesFilter: Record<OJP_Legacy.ModeOfTransportType, boolean>;
  public mapRailSubmodeFilter: Record<string, boolean>;

  public isV1: boolean;

  public useRealTimeDataTypes: OJP_SharedTypes.UseRealtimeDataEnum[];
  public selectedUseRealTimeDataType: OJP_SharedTypes.UseRealtimeDataEnum;

  constructor(public userTripService: UserTripService, private languageService: LanguageService) {
    const queryParams = new URLSearchParams(document.location.search);

    this.tripTransportModeData = appTripTransportModeData;

    this.tripTransportModes = JSON.parse(JSON.stringify(this.tripTransportModeData[0].transportModes));
    this.prevTransportMode = 'public_transport';

    this.settingsCollapseID = 'mode_custom_mode_settings_NOT_READY_YET';

    const userMinDuration = queryParams.get('minDuration');
    const userMaxDuration = queryParams.get('maxDuration');
    const userMinDistance = queryParams.get('minDistance');
    const userMaxDistance = queryParams.get('maxDistance');
    
    this.filterMinDurationControl.setValue(userMinDuration ?? '2', { emitEvent: false });
    this.filterMaxDurationControl.setValue(userMaxDuration ?? '30', { emitEvent: false });
    this.filterMinDistanceControl.setValue(userMinDistance ?? '100', { emitEvent: false });
    this.filterMaxDistanceControl.setValue(userMaxDistance ?? '10000', { emitEvent: false });

    this.isFilterMinDurationEnabled = false;
    this.isFilterMaxDurationEnabled = true;
    this.isFilterMinDistanceEnabled = false;
    this.isFilterMaxDistanceEnabled = false;

    if (userMinDuration !== null) {
      this.isFilterMinDurationEnabled = true;
    }
    if (userMinDistance !== null) {
      this.isFilterMinDistanceEnabled = true;
    }
    if (userMaxDistance !== null) {
      this.isFilterMaxDistanceEnabled = true;
    }

    this.isNumberOfResultsEnabled = true;
    this.isNumberOfResultsBeforeEnabled = false;
    this.isNumberOfResultsAfterEnabled = false;
    
    this.numberOfResults = TRIP_REQUEST_DEFAULT_NUMBER_OF_RESULTS;
    if (this.userTripService.tripModeType !== 'monomodal') {
      this.numberOfResults = 1;
    }
    
    this.numberOfResultsBefore = 1;
    this.numberOfResultsAfter = 4;
    this.walkSpeedDeviation = 100;
    this.walkSpeedDeviationValues = [50, 75, 100, 150, 200, 400];

    this.mapPublicTransportModesFilter = <Record<OJP_Legacy.ModeOfTransportType, boolean>>{};
    this.mapPublicTransportModesFilter.rail = false;
    this.mapPublicTransportModesFilter.bus = false;
    this.mapPublicTransportModesFilter.water = false;
    this.mapPublicTransportModesFilter.tram = false;
    this.mapRailSubmodeFilter = {
      international: false,
      highSpeedRail: false,
      interregionalRail: false,
      railShuttle: false,
      local: false,
    };

    this.isV1 = OJP_VERSION === '1.0';

    this.useRealTimeDataTypes = ['full', 'explanatory', 'none'];
    this.selectedUseRealTimeDataType = this.userTripService.useRealTimeDataType;
  }

  async ngOnInit(): Promise<void> {
    const tripTransportModeData = this.tripTransportModeData.find(tripTransportMode => {
      return tripTransportMode.modeType === this.userTripService.tripModeType;
    }) ?? this.tripTransportModeData[0];

    this.tripTransportModes = JSON.parse(JSON.stringify(tripTransportModeData.transportModes));
    this.prevTransportMode = this.userTripService.tripTransportMode;

    this.userTripService.defaultsInited.subscribe(nothing => {
      this.initAfterTripService();
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

  private initAfterTripService() {
    this.userTripService.updateTripLocationCustomMode();

    const isMonomodal = this.userTripService.tripModeType === 'monomodal';

    if (!isMonomodal) {
      this.userTripService.isAdditionalRestrictionsEnabled = true;
      this.updateAdditionalRestrictions();
    }

    const isCar = this.userTripService.tripTransportMode === carTransportMode;
    if (isMonomodal && isCar) {
      this.numberOfResults = 0;
      this.userTripService.numberOfResults = 0;
    }

    if (this.userTripService.publicTransportModesFilter.length > 0) {
      this.userTripService.isAdditionalRestrictionsEnabled = true;

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

    if (this.mapPublicTransportModesFilter.rail) {
      this.userTripService.railSubmodesFilter.forEach(railSubmode => {
        this.mapRailSubmodeFilter[railSubmode] = true;
      });
    }

    this.updateAdditionalRestrictions();

    this.userTripService.searchFormAfterDefaultsInited.emit();
  }

  public updateAdditionalRestrictions() {
    let minDuration = null;
    let maxDuration = null;
    let minDistance = null;
    let maxDistance = null;
    
    let numberOfResults: number | null = (() => {
      if (this.userTripService.tripModeType !== 'monomodal') {
        return 1;
      }

      if (this.userTripService.tripTransportMode !== 'public_transport') {
        return 0;
      }

      return TRIP_REQUEST_DEFAULT_NUMBER_OF_RESULTS;
    })();

    let numberOfResultsBefore: number | null = null;
    let numberOfResultsAfter: number | null = null;
    
    this.userTripService.publicTransportModesFilter = [];
    this.userTripService.walkSpeedDeviation = null;

    if (this.userTripService.isAdditionalRestrictionsEnabled) {
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

      const availablePublicTransportModesFilter: OJP_Legacy.ModeOfTransportType[] = ['bus', 'tram', 'rail', 'water'];
      availablePublicTransportModesFilter.forEach(modeFilter => {
        if (this.mapPublicTransportModesFilter[modeFilter] === true) {
          this.userTripService.publicTransportModesFilter.push(modeFilter);
        }
      });

      

      this.userTripService.railSubmodesFilter = [];
      if (this.mapPublicTransportModesFilter.rail) {
        const availableRailSubmodesFilter: string[] = Object.keys(this.mapRailSubmodeFilter);
        availableRailSubmodesFilter.forEach(railSubmode => {
          if (this.mapRailSubmodeFilter[railSubmode]) {
            this.userTripService.railSubmodesFilter.push(railSubmode);
          }
        });
      }

      this.userTripService.walkSpeedDeviation = this.walkSpeedDeviation;
    }

    this.userTripService.updateTripLocationRestrictions(minDuration, maxDuration, minDistance, maxDistance);
    this.userTripService.numberOfResults = numberOfResults;
    this.userTripService.numberOfResultsAfter = numberOfResultsAfter;
    this.userTripService.numberOfResultsBefore = numberOfResultsBefore;
    this.userTripService.useRealTimeDataType = this.selectedUseRealTimeDataType;

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
      if (!this.userTripService.isAdditionalRestrictionsEnabled) {
        this.userTripService.isAdditionalRestrictionsEnabled = true;
      }

      this.numberOfResults = 1;

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

  public computeTripModeTypeText(tripModeType: OJP_Legacy.TripModeType): string {
    const MapTripMotType: Record<OJP_Legacy.TripModeType, string> = {
      monomodal: 'Monomodal',
      mode_at_start: 'Mode at Start',
      mode_at_end: 'Mode at End',
      mode_at_start_end: 'Mode at Start & End'
    }

    const text = MapTripMotType[tripModeType] ?? 'n/a';
    return text;
  }

  public computeTripTransportModeText(transportMode: OJP_Legacy.IndividualTransportMode): string {
    const MapIndividualTransportMode: Record<OJP_Legacy.IndividualTransportMode, string> = {
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
    this.userTripService.isAdditionalRestrictionsEnabled = !this.userTripService.isAdditionalRestrictionsEnabled;

    this.updateAdditionalRestrictions();
  }
}
