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

type MapLocations = Record<OJP_SharedTypes.PlaceTypeEnum, OJP_Legacy.Location[]>;
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

  public mapLookupLocations: MapLocations;
  public optionLocationTypes: OptionLocationType[];

  @Input() placeholder: string = '';
  @Input() endpointType: OJP_Legacy.JourneyPointType = 'From';
  @Input() inputValue: string = '';
  @Output() selectedLocation = new EventEmitter<OJP_Legacy.Location>()

  constructor(private mapService: MapService, private userTripService: UserTripService, private languageService: LanguageService) {
    this.mapLookupLocations = {} as MapLocations;
    this.resetMapLocations();

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
        this.resetMapLocations()
        
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
    
    const locationType = optionIdParts[0] as OJP_SharedTypes.PlaceTypeEnum;
    const locationIdx = parseInt(optionIdParts[1], 10);

    const location = this.mapLookupLocations[locationType][locationIdx];

    const inputValue = location.computeLocationName();
    this.inputControl.setValue(inputValue);

    this.selectedLocation.emit(location);
  }

  private async fetchJourneyPoints(searchTerm: string) {
    const stageConfig = this.userTripService.getStageConfig();
    const isOJPv2 = OJP_VERSION === '2.0';
    const xmlConfig = isOJPv2 ? OJP_Next.DefaultXML_Config : OJP_Next.XML_BuilderConfigOJPv1;

    const request = OJP_Legacy.LocationInformationRequest.initWithLocationName(stageConfig, this.languageService.language, xmlConfig, REQUESTOR_REF, searchTerm, []);
    request.enableExtensions = this.userTripService.currentAppStage !== 'OJP-SI';
    
    const response = await request.fetchResponse();

    this.resetMapLocations();
      
    response.locations.forEach(location => {
      const locationType = location.getLocationType();
      if (locationType === null) {
        return;
      }

      this.mapLookupLocations[locationType].push(location);
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

    const inputValue = geoPosition.asLatLngString(false)
    this.inputControl.setValue(inputValue);

    this.selectedLocation.emit(location);
  }

  private resetMapLocations() {
    this.mapLookupLocations = {
      address: [],
      poi: [],
      stop: [],
      topographicPlace: [],
      location: [],
    };
  }
}
