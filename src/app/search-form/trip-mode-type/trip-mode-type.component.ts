import { Component, Input, OnInit, ViewChild, ElementRef } from '@angular/core';

import * as OJP from 'ojp-sdk'

import { UserTripService } from 'src/app/shared/services/user-trip.service';

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
  @Input() tripModeTypeIdx: number
  @ViewChild('settingsContainer') settingsContainer!: ElementRef; 

  public tripTransportModeData: TripTransportModeData[]

  public tripModeType: OJP.TripModeType
  public tripTransportModes: OJP.IndividualTransportMode[]
  public tripTransportMode: OJP.IndividualTransportMode

  public settingsCollapseID: string
  public endpointMinDurationS: string
  public endpointMaxDurationS: string
  public endpointMinDistanceS: string
  public endpointMaxDistanceS: string

  constructor(public userTripService: UserTripService) {
    this.tripTransportModeData = appTripTransportModeData;

    this.tripModeType = this.tripTransportModeData[0].modeType
    this.tripTransportModes = JSON.parse(JSON.stringify(this.tripTransportModeData[0].transportModes))
    this.tripTransportMode = this.tripTransportModes[0]

    this.tripModeTypeIdx = 0

    this.settingsCollapseID = 'mode_custom_mode_settings_NOT_READY_YET';
    this.endpointMinDurationS = '2';
    this.endpointMaxDurationS = '30';
    this.endpointMinDistanceS = '100';
    this.endpointMaxDistanceS = '20000';
  }

  ngOnInit() {
    this.tripModeType = this.userTripService.tripModeTypes[this.tripModeTypeIdx];

    const tripTransportModeData = this.tripTransportModeData.find(tripTransportMode => {
      return tripTransportMode.modeType === this.tripModeType;
    }) ?? this.tripTransportModeData[0];

    this.tripTransportModes = JSON.parse(JSON.stringify(tripTransportModeData.transportModes));
    this.tripTransportMode = this.userTripService.tripTransportModes[this.tripModeTypeIdx];

    this.userTripService.defaultsInited.subscribe(nothing => {
      this.userTripService.updateTripLocationCustomMode(this.tripModeTypeIdx);
    })

    this.settingsCollapseID = 'mode_custom_mode_settings_' + this.tripModeTypeIdx;
  }

  private isLastSegment(): boolean {
    return this.tripModeTypeIdx === (this.userTripService.tripModeTypes.length - 1);
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

    this.userTripService.updateTripMode(this.tripModeType, this.tripTransportMode, this.tripModeTypeIdx);
    this.userTripService.updateTripLocationCustomMode(this.tripModeTypeIdx);
  }

  public onTransportModeChange() {
    this.userTripService.updateTripMode(this.tripModeType, this.tripTransportMode, this.tripModeTypeIdx);
    this.userTripService.updateTripLocationCustomMode(this.tripModeTypeIdx);

    if (this.tripTransportMode === 'public_transport') {
      this.settingsContainer.nativeElement.classList.remove('show');
    }
  }
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

  public onRestrictionsChange() {
    const minDuration = parseInt(this.endpointMinDurationS, 10);
    const maxDuration = parseInt(this.endpointMaxDurationS, 10);
    const minDistance = parseInt(this.endpointMinDistanceS, 10);
    const maxDistance = parseInt(this.endpointMaxDistanceS, 10);

    this.userTripService.updateTripLocationRestrictions(minDuration, maxDuration, minDistance, maxDistance, this.tripModeTypeIdx);
  }
}
