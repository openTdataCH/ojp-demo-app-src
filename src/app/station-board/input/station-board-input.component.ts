import { Component, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'

import { SbbAutocompleteSelectedEvent, SbbAutocompleteTrigger } from '@sbb-esta/angular/autocomplete';

import OJP_Legacy from '../../config/ojp-legacy';
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

  @Output() locationSelected = new EventEmitter<OJP_Legacy.Location>()

  public searchInputControl: FormControl;
  public stopLookups: StopLookup[]
  private currentStopLookup: StopLookup | null
  public isBusySearching: boolean // TODO - do we actually need this?

   // TODO - this is an workaround to flag that the INPUT was changed programatically
  //      - tried with .setValue(..., { emitEvent: false }); but didnt work as expected
  //      - therefore => workaround
  private hackIgnoreInputChangesFlag: boolean

  constructor(private userTripService: UserTripService, private languageService: LanguageService) {
    this.searchInputControl = new FormControl('');
    this.stopLookups = [StationBoardInputComponent.AroundMeStopLookup]
    this.currentStopLookup = null
    this.isBusySearching = false
    this.hackIgnoreInputChangesFlag = false;
  }

  private static get AroundMeStopLookup(): StopLookup {
    const stopLookup = <StopLookup>{
      stopPlaceRef: 'AROUND_ME',
      stopName: 'Current Location',
      special_type: 'around_me',
      location: null,
    }

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
    let lookupName = stopLookup.stopName;
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

    this.fetchLookupLocations(searchTerm);
  }

  private async fetchLookupLocations(searchTerm: string) {
    this.isBusySearching = true;
    const isOJPv2 = OJP_VERSION === '2.0';
    const xmlConfig = isOJPv2 ? OJP_Legacy.XML_ConfigOJPv2 : OJP_Legacy.XML_BuilderConfigOJPv1;

    const restrictionType: OJP_Legacy.RestrictionType = 'stop';
    const stageConfig = this.userTripService.getStageConfig();
    const locationInformationRequest = OJP_Legacy.LocationInformationRequest.initWithLocationName(stageConfig, this.languageService.language, xmlConfig, REQUESTOR_REF, searchTerm, [restrictionType]);
    locationInformationRequest.enableExtensions = this.userTripService.currentAppStage !== 'OJP-SI';

    const response = await locationInformationRequest.fetchResponse();
    
    this.parseLocations(response.locations);
    this.isBusySearching = false;
  }

  private parseLocations(locations: OJP_Legacy.Location[], nearbyGeoPosition: OJP_Legacy.GeoPosition | null = null) {
    this.stopLookups = [];
    
    locations.forEach(location => {
      const stopPlaceRef = location.stopPlace?.stopPlaceRef as string;
      if (stopPlaceRef === null) {
        return
      }

      const stopName: string | null = (() => {
        if (location.locationName !== null) {
          return location.locationName;
        }

        return location.computeLocationName(); 
      })();
    
      const stopLookup = <StopLookup>{
        stopPlaceRef: stopPlaceRef,
        stopName: stopName,
        location: location,
      };

      if (location.geoPosition && nearbyGeoPosition) {
        stopLookup.distance = location.geoPosition.distanceFrom(nearbyGeoPosition);
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
    const stopPlaceRef = ev.option.value as string;

    let stopLookup = this.stopLookups.find(stopLookup => {
      return stopLookup.stopPlaceRef === stopPlaceRef;
    }) ?? null;

    if (stopLookup === null) {
      console.log('WHOOPS - cant find the stop for: ' + stopPlaceRef);
      return;
    }

    if (stopLookup.special_type === 'around_me') {
      this.handleGeolocationLookup();
      return;
    }

    this.currentStopLookup = stopLookup

    this.hackIgnoreInputChangesFlag = true;
    this.searchInputControl.setValue(stopLookup.stopName);

    const location = stopLookup.location;
    if (location) {
      this.locationSelected.emit(location);
    }
  }

  private handleGeolocationLookup() {
    if (!navigator.geolocation) {
      console.log('no navigator.geolocation enabled')
      return;
    }

    this.hackIgnoreInputChangesFlag = true;
    this.searchInputControl.setValue('... looking up location');
      
    navigator.geolocation.getCurrentPosition((position: GeolocationPosition) => {
      this.handleNewGeoPosition(position, locations => {
        const geoPosition = new OJP_Legacy.GeoPosition(position.coords.longitude, position.coords.latitude)
        this.parseLocations(locations, geoPosition);
    
        this.autocompleteInputTrigger?.openPanel();
      });
    });
  }

  private async handleNewGeoPosition(position: GeolocationPosition, completion: (locations: OJP_Legacy.Location[]) => void) {
    const bbox_width = 0.05;
    const bbox_height = 0.05;
    const bbox_W = position.coords.longitude - bbox_width / 2;
    const bbox_E = position.coords.longitude + bbox_width / 2;
    const bbox_N = position.coords.latitude + bbox_height / 2;
    const bbox_S = position.coords.latitude - bbox_height / 2;

    const isOJPv2 = OJP_VERSION === '2.0';
    const xmlConfig = isOJPv2 ? OJP_Legacy.XML_ConfigOJPv2 : OJP_Legacy.XML_BuilderConfigOJPv1;
    
    const stageConfig = this.userTripService.getStageConfig();

    const request = OJP_Legacy.LocationInformationRequest.initWithBBOXAndType(
      stageConfig,
      this.languageService.language,
      xmlConfig,
      REQUESTOR_REF,

      bbox_W, bbox_N, bbox_E, bbox_S,
      ['stop'],
      300,
    );
    request.enableExtensions = this.userTripService.currentAppStage !== 'OJP-SI';

    const response = await request.fetchResponse();
    completion(response.locations);
  }

  public updateLocationText(location: OJP_Legacy.Location) {
    const stopPlaceName = location.stopPlace?.stopPlaceName ?? null
    if (stopPlaceName === null) {
      return;
    }

    this.hackIgnoreInputChangesFlag = true;
    this.searchInputControl.setValue(stopPlaceName);
  }
}
