import { debounceTime, distinctUntilChanged } from 'rxjs/operators'
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroupDirective, NgForm, Validators } from '@angular/forms';

import { SbbAutocompleteSelectedEvent } from '@sbb-esta/angular/autocomplete';
import { SbbErrorStateMatcher } from '@sbb-esta/angular/core';

import * as OJP_Types from 'ojp-shared-types';

import { OJP_VERSION } from '../../config/constants';

import { MapService } from '../../shared/services/map.service';
import { LanguageService } from '../../shared/services/language.service'
import { UserTripService } from '../../shared/services/user-trip.service';
import { AnyPlace, PlaceBuilder } from '../../shared/models/place/place-builder';
import { PlaceLocation } from '../../shared/models/place/location';
import { OJPHelpers } from '../../helpers/ojp-helpers';

type MapLocations = Record<OJP_Types.PlaceTypeEnum, AnyPlace[]>;
type OptionLocationType = [OJP_Types.PlaceTypeEnum, string];

export class ErrorStateMatcher implements SbbErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
  }
}

@Component({
  selector: 'journey-point-input',
  templateUrl: './journey-point-input.component.html',
  styleUrls: ['./journey-point-input.component.scss']
})
export class JourneyPointInputComponent implements OnInit, OnChanges {
  private shouldFetchNewData = true;

  public inputControl = new FormControl('', [Validators.required]);

  public mapLookupPlaces: MapLocations;
  public optionLocationTypes: OptionLocationType[];

  @Input() placeholder: string = '';
  
  @Input() currentPlace: AnyPlace | null;
  @Output() selectedNewPlace = new EventEmitter<AnyPlace>();

  constructor(private mapService: MapService, private userTripService: UserTripService, private languageService: LanguageService) {
    this.mapLookupPlaces = {} as MapLocations;
    this.resetMapPlaces();

    this.optionLocationTypes = [
      ['stop', 'Stops'],
      ['poi', 'POIs'],
      ['topographicPlace', 'Topographic Places'],
      ['address', 'Addresses'],
    ];

    this.currentPlace = null;
  }

  ngOnInit() {
    this.inputControl.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe((searchTerm: string | null) => {
      if (searchTerm === null) {
        return;
      }

      if (!this.shouldFetchNewData) {
        return;
      }

      if (searchTerm.trim().length < 1) {
        return;
      }

      const coordsPlace = PlaceLocation.initFromLiteralCoords(searchTerm);
      if (coordsPlace) {
        this.resetMapPlaces();
        this.handleSelectedPlace(coordsPlace);
        return;
      }

      this.fetchJourneyPoints(searchTerm);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if ('currentPlace' in changes) {
      const place = changes['currentPlace'].currentValue as AnyPlace;
      if (place) {
        this.inputControl.setValue(place.computeName(), { emitEvent: false });
      }
    }
  }

  onOpenAutocomplete() {
    this.shouldFetchNewData = true
  }

  onOptionSelected(ev: SbbAutocompleteSelectedEvent) {
    this.shouldFetchNewData = false;

    const optionIdParts = ev.option.value.split('.');
    if (optionIdParts.length !== 2) {
      return;
    }
    
    const placeType = optionIdParts[0] as OJP_Types.PlaceTypeEnum;
    const itemIdx = parseInt(optionIdParts[1], 10);

    const place = this.mapLookupPlaces[placeType][itemIdx];
    this.handleSelectedPlace(place);
  }

  private async fetchJourneyPoints(searchTerm: string) {
    const ojpSDK_Next = this.userTripService.createOJP_SDK_Instance(this.languageService.language);
    const request = ojpSDK_Next.requests.LocationInformationRequest.initWithLocationName(searchTerm);
    
    const response = await request.fetchResponse(ojpSDK_Next);

    if (!response.ok) {
      console.log('ERROR - failed to lookup locations for "' + searchTerm + '"');
      console.log(response);
      return;
    }

    this.resetMapPlaces();

    const placeResults = OJPHelpers.parseAnyPlaceResult(OJP_VERSION, response);
    placeResults.forEach((placeResult, idx) => {
      const place = PlaceBuilder.initWithPlaceResultSchema(OJP_VERSION, placeResult);
      if (place === null) {
          return;
      }

      this.mapLookupPlaces[place.type].push(place);
    });
  }

  public handleTapOnMapButton() {
    if (this.currentPlace) {
      this.mapService.tryToCenterAndZoomToPlace(this.currentPlace);
    }
  }

  private handleSelectedPlace(place: AnyPlace) {
    const inputValue = place.computeName();
    this.inputControl.setValue(inputValue);

    this.currentPlace = place;
    this.selectedNewPlace.emit(place);
  }

  private resetMapPlaces() {
    this.mapLookupPlaces = {
      address: [],
      poi: [],
      stop: [],
      topographicPlace: [],
      location: [],
    };
  }
}
