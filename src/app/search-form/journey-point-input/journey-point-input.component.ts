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

interface RenderPlaceResult {
  place: AnyPlace,
  type: 'around_me' | 'place',
  caption: string,
  distance?: number,
};

type MapPlaces = Record<OJP_Types.PlaceTypeEnum, RenderPlaceResult[]>;
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
  private considerInputControlChanges: boolean;

  public inputControl: FormControl;

  public mapLookupPlaces: MapPlaces;
  public optionLocationTypes: OptionLocationType[];

  @Input() placeholder: string = '';
  @Input() filterPlaceType: OJP_Types.PlaceTypeEnum | undefined;
  
  @Input() currentPlace: AnyPlace | null;
  @Output() selectedNewPlace = new EventEmitter<AnyPlace>();

  public useSingleSearchPool: boolean;

  constructor(private mapService: MapService, private userTripService: UserTripService, private languageService: LanguageService) {
    this.considerInputControlChanges = true;
    
    this.inputControl = new FormControl('', [Validators.required]);

    this.mapLookupPlaces = {} as MapPlaces;
    this.resetMapPlaces();

    this.optionLocationTypes = [
      ['stop', 'Stops'],
      ['poi', 'POIs'],
      ['topographicPlace', 'Topographic Places'],
      ['address', 'Addresses'],
    ];

    this.currentPlace = null;

    this.useSingleSearchPool = this.filterPlaceType !== undefined;
  }

  ngOnInit() {
    this.inputControl.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe((searchTerm: string | null) => {
      this.onInputChangeAfterIdle();
    });
  }

  private onInputChangeAfterIdle() {
    const searchTerm = this.inputControl.value.trim();

    if (searchTerm.trim().length < 1) {
      this.useSingleSearchPool = true;
      
      this.resetMapPlaces();

    this.useSingleSearchPool = this.filterPlaceType !== undefined;

    const coordsPlace = PlaceLocation.initFromLiteralCoords(searchTerm);
    if (coordsPlace) {
      this.resetMapPlaces();
      this.handleSelectedPlace(coordsPlace);
      return;
    }

    this.fetchJourneyPoints(searchTerm);
  }

  ngOnChanges(changes: SimpleChanges) {
    const change = changes['currentPlace'] ?? null;
    this.handleCurrentPlaceChange(change);
  }

  private handleCurrentPlaceChange(change: SimpleChange | null) {
    if (!change) {
      return;
    }

    if (change.firstChange) {
      return;
    }
    if (change.previousValue === change.currentValue) {
      return;
    }

    const place = change.currentValue as AnyPlace;
    if (place) {
      this.inputControl.setValue(place.computeName(), { emitEvent: false });
    }
  }

  onOpenAutocomplete() {
    this.considerInputControlChanges = true;
  }

  onOptionSelected(ev: SbbAutocompleteSelectedEvent) {

    const optionIdParts = ev.option.value.split('.');
    if (optionIdParts.length !== 2) {
      return;
    }
    
    const placeType = optionIdParts[0] as OJP_Types.PlaceTypeEnum;
    const itemIdx = parseInt(optionIdParts[1], 10);
    const placeResult = this.mapLookupPlaces[placeType][itemIdx];

    if (placeResult.type === 'around_me') {
    } else {
      const place = placeResult.place;
      this.handleSelectedPlace(place);
    }
  }

  private async fetchJourneyPoints(searchTerm: string) {
    const ojpSDK_Next = this.userTripService.createOJP_SDK_Instance(this.languageService.language);
    const placeTypes = this.filterPlaceType === undefined ? undefined : [this.filterPlaceType];
    const request = ojpSDK_Next.requests.LocationInformationRequest.initWithLocationName(searchTerm, placeTypes, 10);
    
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

      const renderPlaceResult: RenderPlaceResult = {
        place: place,
        type: 'place',
        caption: place.computeName(),
      };

      this.mapLookupPlaces[place.type].push(renderPlaceResult);
    });
  }

  public handleTapOnMapButton() {
    if (this.currentPlace) {
      this.mapService.tryToCenterAndZoomToPlace(this.currentPlace);
    }
  }

  private handleSelectedPlace(place: AnyPlace) {
    this.considerInputControlChanges = false;
    
    this.inputControl.setValue(place.computeName(), { emitEvent: false });
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
