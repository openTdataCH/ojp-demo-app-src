import { Component, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'

import { SbbAutocompleteSelectedEvent, SbbAutocompleteTrigger } from '@sbb-esta/angular/autocomplete';

import OJP_Legacy from '../../config/ojp-legacy';
import * as OJP_SharedTypes from 'ojp-shared-types';
import * as OJP_Next from 'ojp-sdk-next';

import { REQUESTOR_REF, OJP_VERSION } from '../../config/constants';

import { UserTripService } from '../../shared/services/user-trip.service';
import { LanguageService } from '../../shared/services/language.service';
import { StopPlace } from '../../shared/models/stop-place';

interface StopLookup {
  stopPlace: StopPlace,
  type: 'around_me' | 'stopPlace',
  distance?: number | null
}

@Component({
  selector: 'station-board-input',
  templateUrl: './station-board-input.component.html',
})
export class StationBoardInputComponent implements OnInit {
  @ViewChild(SbbAutocompleteTrigger, { static: true }) autocompleteInputTrigger: SbbAutocompleteTrigger | undefined;

  @Output() stopPlaceSelected = new EventEmitter<StopPlace>();

  public searchInputControl: FormControl;
  public stopLookups: StopLookup[];
  public isBusySearching: boolean;

  // TODO - this is an workaround to flag that the INPUT was changed programatically
  //      - tried with .setValue(..., { emitEvent: false }); but didnt work as expected
  //      - therefore => workaround
  private hackIgnoreInputChangesFlag: boolean

  constructor(private userTripService: UserTripService, private languageService: LanguageService) {
    this.searchInputControl = new FormControl('');
    this.stopLookups = [StationBoardInputComponent.AroundMeStopLookup];
    this.isBusySearching = false;
    this.hackIgnoreInputChangesFlag = false;
  }

  private static get AroundMeStopLookup(): StopLookup {
    const stopLookup: StopLookup = {
      stopPlace: new StopPlace(0, 0, 'Current Location', 'n/a'),
      type: 'around_me',
      distance: null,
    };

    return stopLookup;
  }

  ngOnInit(): void {
    this.searchInputControl.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe((searchTerm: string) => {
      this.onInputChangeAfterIdle();
    });
  }

  public renderLookupName(stopLookup: StopLookup): string {
    let lookupName = stopLookup.stopPlace.name;
    if (stopLookup.distance) {
      lookupName += ' (' + stopLookup.distance + ' m)';
    }

    return lookupName;
  }

  // This event is triggered after some idle time
  private onInputChangeAfterIdle() {
    const searchTerm = this.searchInputControl.value.trim();

    if (this.hackIgnoreInputChangesFlag) {
      this.hackIgnoreInputChangesFlag = false;
      return;
    }

    if (searchTerm.length === 0) {
      this.stopLookups = [StationBoardInputComponent.AroundMeStopLookup];
      return;
    }

    if (searchTerm.length < 3) {
      return;
    }

    this.fetchStopLookups(searchTerm);
  }

  private async fetchStopLookups(searchTerm: string) {
    const request = OJP_Next.LocationInformationRequest.initWithLocationName(searchTerm, ['stop'], 10);
    
    const ojpSDK_Next = this.createOJP_SDK_Instance();

    this.isBusySearching = true;
    const response = await ojpSDK_Next.fetchLocationInformationRequestResponse(request);
    this.isBusySearching = false;

    if (response.ok) {
      this.parsePlaceResults(response.value.placeResult);
    } else {
      console.log('ERROR - failed to lookup locations for "' + searchTerm + '"');
      console.log(response);
      this.parsePlaceResults([]);
    }
  }

  private parsePlaceResults(placeResults: OJP_SharedTypes.PlaceResultSchema[], nearbyGeoPosition: OJP_Next.GeoPosition | null = null) {
    this.stopLookups = [];
    
    placeResults.forEach(placeResult => {
      const stopPlace = StopPlace.initWithPlaceResultSchema(placeResult);
      if (stopPlace === null) {
        return;
      }

      const stopLookup: StopLookup = {
        stopPlace: stopPlace,
        type: 'stopPlace',
        distance: null,
      };

      if (nearbyGeoPosition) {
        stopLookup.distance = stopPlace.distanceFrom(nearbyGeoPosition);
      }

      this.stopLookups.push(stopLookup);
    });

    if (nearbyGeoPosition) {
      // Sort by distance if needed
      this.stopLookups.sort((a, b) => {
        if (a.distance === null || a.distance === undefined) {
          return 0;
        }
        if (b.distance === null || b.distance === undefined) {
          return 0;
        }
        return a.distance - b.distance;
      });
    }

    this.stopLookups = this.stopLookups.slice(0, 10);
  }

  public onStopLookupSelected(ev: SbbAutocompleteSelectedEvent) {
    const stopPlaceIdx = Number(ev.option.value);
    const stopLookup = this.stopLookups[stopPlaceIdx];

    if (stopLookup.type === 'around_me') {
      this.handleGeolocationLookup();
      return;
    }

    this.hackIgnoreInputChangesFlag = true;
    this.searchInputControl.setValue(stopLookup.stopPlace.name);

    this.stopPlaceSelected.emit(stopLookup.stopPlace);
  }

  private handleGeolocationLookup() {
    if (!navigator.geolocation) {
      console.log('no navigator.geolocation enabled')
      return;
    }

    this.hackIgnoreInputChangesFlag = true;
    this.searchInputControl.setValue('... looking up location');
      
    navigator.geolocation.getCurrentPosition((position: GeolocationPosition) => {
      this.handleNewGeoPosition(position, placeResults => {
        const geoPosition = new OJP_Next.GeoPosition(position.coords.longitude, position.coords.latitude)
        this.parsePlaceResults(placeResults, geoPosition);
    
        this.autocompleteInputTrigger?.openPanel();
      });
    });
  }

  private async handleNewGeoPosition(position: GeolocationPosition, completion: (placeResults: OJP_SharedTypes.PlaceResultSchema[]) => void) {
    const bbox_width = 0.05;
    const bbox_height = 0.05;
    const bbox_W = position.coords.longitude - bbox_width / 2;
    const bbox_E = position.coords.longitude + bbox_width / 2;
    const bbox_N = position.coords.latitude + bbox_height / 2;
    const bbox_S = position.coords.latitude - bbox_height / 2;

    const bboxData = [bbox_W, bbox_S, bbox_E, bbox_N];
    const request = OJP_Next.LocationInformationRequest.initWithBBOX(bboxData, ['stop'], 300);

    const ojpSDK_Next = this.createOJP_SDK_Instance();
    this.isBusySearching = true;
    const response = await ojpSDK_Next.fetchLocationInformationRequestResponse(request);
    this.isBusySearching = false;

    if (response.ok) {
      completion(response.value.placeResult);
    } else {
      console.log('ERROR - failed to bbox lookup locations for "' + bboxData.join(', ') + '"');
      console.log(response);
      completion([]);
    }
  }

  public updateLocationText(locationText: string) {
    this.hackIgnoreInputChangesFlag = true;
    this.searchInputControl.setValue(locationText);
  }

  private createOJP_SDK_Instance(): OJP_Next.SDK {
    const isOJPv2 = OJP_VERSION === '2.0';
    const xmlConfig = isOJPv2 ? OJP_Next.DefaultXML_Config : OJP_Next.XML_BuilderConfigOJPv1;

    const stageConfig = this.userTripService.getStageConfig();    
    const sdk = new OJP_Next.SDK(REQUESTOR_REF, stageConfig, this.languageService.language, xmlConfig);
    return sdk;
  }  
}
