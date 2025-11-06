import { debounceTime, distinctUntilChanged } from 'rxjs/operators'
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroupDirective, NgForm, Validators } from '@angular/forms';

import { SbbAutocompleteSelectedEvent } from '@sbb-esta/angular/autocomplete';
import { SbbErrorStateMatcher } from '@sbb-esta/angular/core';

import * as OJP_SharedTypes from 'ojp-shared-types';
import * as OJP_Next from 'ojp-sdk-next';

import OJP_Legacy from '../../config/ojp-legacy';

import { REQUESTOR_REF, OJP_VERSION } from '../../config/constants';

import { MapService } from '../../shared/services/map.service';
import { LanguageService } from '../../shared/services/language.service'
import { UserTripService } from '../../shared/services/user-trip.service';
import { AnyPlace, PlaceBuilder } from '../../shared/models/place/place-builder';
import { PlaceLocation } from '../../shared/models/place/location';

type MapLocations = Record<OJP_SharedTypes.PlaceTypeEnum, AnyPlace[]>;
type OptionLocationType = [OJP_SharedTypes.PlaceTypeEnum, string];

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
  @Input() endpointType: OJP_Legacy.JourneyPointType = 'From';
  @Input() inputValue: string = '';
  @Output() selectedPlace = new EventEmitter<AnyPlace>();

  constructor(private mapService: MapService, private userTripService: UserTripService, private languageService: LanguageService) {
    this.mapLookupPlaces = {} as MapLocations;
    this.resetMapPlaces();

    this.optionLocationTypes = [
      ['stop', 'Stops'],
      ['poi', 'POIs'],
      ['topographicPlace', 'Topographic Places'],
      ['address', 'Addresses'],
    ];
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

      const coordsLocation = OJP_Legacy.Location.initFromLiteralCoords(searchTerm);
      if (coordsLocation) {
        this.resetMapPlaces()
        
        this.handleCoordsPick(coordsLocation)
        return
      }

      this.fetchJourneyPoints(searchTerm);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if ('inputValue' in changes) {
      const newInputValue = changes['inputValue'].currentValue;
      if (newInputValue === '') {
        return;
      }  
      this.inputControl.setValue(newInputValue, { emitEvent: false });
    }
  }

  onOpenAutocomplete() {
    this.shouldFetchNewData = true
  }

  onOptionSelected(ev: SbbAutocompleteSelectedEvent) {
    this.shouldFetchNewData = false

    const optionIdParts = ev.option.value.split('.');
    if (optionIdParts.length !== 2) {
      return;
    }
    
    const placeType = optionIdParts[0] as OJP_SharedTypes.PlaceTypeEnum;
    const itemIdx = parseInt(optionIdParts[1], 10);

    const place = this.mapLookupPlaces[placeType][itemIdx];

    const inputValue = place.computeName();
    this.inputControl.setValue(inputValue);

    this.selectedPlace.emit(place);
  }

  private async fetchJourneyPoints(searchTerm: string) {
    const request = OJP_Next.LocationInformationRequest.initWithLocationName(searchTerm, []);
    const ojpSDK_Next = this.createOJP_SDK_Instance();
    const response = await ojpSDK_Next.fetchLocationInformationRequestResponse(request);

    if (!response.ok) {
      console.log('ERROR - failed to lookup locations for "' + searchTerm + '"');
      console.log(response);
      return;
    }

    this.resetMapPlaces();

    response.value.placeResult.forEach((placeResult, idx) => {
      const place = PlaceBuilder.initWithPlaceResultSchema(placeResult);
      if (place === null) {
          return;
      }

      this.mapLookupPlaces[place.type].push(place);
    });
  }

  public handleTapOnMapButton() {
    const location: OJP_Legacy.Location | null = (() => {
      if (this.endpointType === 'From') {
        return this.userTripService.fromTripLocation?.location ?? null;
      }

      if (this.endpointType === 'To') {
        return this.userTripService.toTripLocation?.location ?? null;
      }

      if (this.endpointType === 'Via') {
        const viaTripLocations = this.userTripService.viaTripLocations;
        if (viaTripLocations.length > 0) {
          const viaTripLocation = viaTripLocations[0];
          return viaTripLocation.location;
        }
      }

      return null;
    })()

    this.mapService.tryToCenterAndZoomToLocation(location);
  }

  private handleCoordsPick(location: OJP_Legacy.Location) {
    const geoPosition = location.geoPosition
    if (geoPosition === null) {
      return
    }

    const place = new PlaceLocation(geoPosition.longitude, geoPosition.latitude, geoPosition.asLatLngString());

    const inputValue = geoPosition.asLatLngString(false);
    this.inputControl.setValue(inputValue);

    this.selectedPlace.emit(place);
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

  private createOJP_SDK_Instance(): OJP_Next.SDK {
      const isOJPv2 = OJP_VERSION === '2.0';
      const xmlConfig = isOJPv2 ? OJP_Next.DefaultXML_Config : OJP_Next.XML_BuilderConfigOJPv1;

      const stageConfig = this.userTripService.getStageConfig();    
      const sdk = new OJP_Next.SDK(REQUESTOR_REF, stageConfig, this.languageService.language, xmlConfig);
      return sdk;
  }  
}
