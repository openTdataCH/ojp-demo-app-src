import { Component, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'

import { SbbAutocompleteSelectedEvent, SbbAutocompleteTrigger } from '@sbb-esta/angular/autocomplete';

import * as OJP_Next from 'ojp-sdk-next';

import { OJP_VERSION } from '../../config/constants';

import { UserTripService } from '../../shared/services/user-trip.service';
import { LanguageService } from '../../shared/services/language.service';
import { StopPlace } from '../../shared/models/place/stop-place';
import { OJPHelpers } from '../../helpers/ojp-helpers';
import { AnyPlaceResultSchema } from '../../shared/types/_all';

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
    const currentLocationStopPlace = StopPlace.Empty();
    currentLocationStopPlace.stopName = 'Current Location';

    const stopLookup: StopLookup = {
      stopPlace: currentLocationStopPlace,
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
    let lookupName = stopLookup.stopPlace.stopName;
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
    const ojpSDK_Next = this.userTripService.createOJP_SDK_Instance(this.languageService.language);

    const request = ojpSDK_Next.requests.LocationInformationRequest.initWithLocationName(searchTerm, ['stop'], 10);

    this.isBusySearching = true;
    const response = await request.fetchResponse(ojpSDK_Next);
    this.isBusySearching = false;

    if (response.ok) {
      const placeResults = OJPHelpers.parseAnyPlaceResult(OJP_VERSION, response);
      this.parsePlaceResults(placeResults);
    } else {
      console.log('ERROR - failed to lookup locations for "' + searchTerm + '"');
      console.log(response);
      this.parsePlaceResults([]);
    }
  }

  private parsePlaceResults(placeResults: AnyPlaceResultSchema[], nearbyGeoPosition: OJP_Next.GeoPosition | null = null) {
    this.stopLookups = [];

    placeResults.forEach(placeResult => {
      const stopPlace = StopPlace.initWithPlaceResultSchema(OJP_VERSION, placeResult);
      if (stopPlace === null) {
        return;
      }

      const stopLookup: StopLookup = {
        stopPlace: stopPlace,
        type: 'stopPlace',
        distance: null,
      };

      if (nearbyGeoPosition) {
        stopLookup.distance = stopPlace.geoPosition.distanceFrom(nearbyGeoPosition);
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
    this.searchInputControl.setValue(stopLookup.stopPlace.stopName);

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

  private async handleNewGeoPosition(position: GeolocationPosition, completion: (placeResults: AnyPlaceResultSchema[]) => void) {
    const bbox_width = 0.05;
    const bbox_height = 0.05;
    const bbox_W = position.coords.longitude - bbox_width / 2;
    const bbox_E = position.coords.longitude + bbox_width / 2;
    const bbox_N = position.coords.latitude + bbox_height / 2;
    const bbox_S = position.coords.latitude - bbox_height / 2;

    const ojpSDK_Next = this.userTripService.createOJP_SDK_Instance(this.languageService.language);

    const bboxData = [bbox_W, bbox_S, bbox_E, bbox_N];
    const request = ojpSDK_Next.requests.LocationInformationRequest.initWithBBOX(bboxData, ['stop'], 300);

    this.isBusySearching = true;
    const response = await request.fetchResponse(ojpSDK_Next);
    this.isBusySearching = false;

    if (response.ok) {
      const placeResults = OJPHelpers.parseAnyPlaceResult(OJP_VERSION, response);
      completion(placeResults);
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
}
