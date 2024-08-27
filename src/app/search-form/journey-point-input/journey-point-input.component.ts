import { debounceTime, distinctUntilChanged } from 'rxjs/operators'
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroupDirective, NgForm, Validators } from '@angular/forms';

import { SbbAutocompleteSelectedEvent } from '@sbb-esta/angular/autocomplete';

import * as OJP from 'ojp-sdk'
import { MapService } from 'src/app/shared/services/map.service';
import { UserTripService } from 'src/app/shared/services/user-trip.service';
import { SbbErrorStateMatcher } from '@sbb-esta/angular/core';

type MapLocations = Record<OJP.LocationType, OJP.Location[]>
type OptionLocationType = [OJP.LocationType, string]

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
  private shouldFetchNewData = true

  public inputControl = new FormControl('', [Validators.required]);
  public inputControlMatcher = new ErrorStateMatcher();

  public mapLookupLocations: MapLocations
  public optionLocationTypes: OptionLocationType[]

  @Input() placeholder: string = '';
  @Input() endpointType: OJP.JourneyPointType = 'From';
  @Input() inputValue: string = '';
  @Output() selectedLocation = new EventEmitter<OJP.Location | null>()

  constructor(private mapService: MapService, private userTripService: UserTripService) {
    this.mapLookupLocations = {} as MapLocations
    this.resetMapLocations()

    this.optionLocationTypes = [
      ['stop', 'Stops'],
      ['poi', 'POIs'],
      ['topographicPlace', 'Topographic Places'],
      ['address', 'Addresses'],
    ]
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

      if (searchTerm.trim().length === 0) {
        this.selectedLocation.emit(null);
        return;
      }

      if (searchTerm.length < 1) {
        return;
      }

      const coordsLocation = OJP.Location.initFromLiteralCoords(searchTerm);
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
    
    const locationType = optionIdParts[0] as OJP.LocationType;
    const locationIdx = parseInt(optionIdParts[1], 10);

    const location = this.mapLookupLocations[locationType][locationIdx];

    const inputValue = location.computeLocationName();
    this.inputControl.setValue(inputValue);

    this.selectedLocation.emit(location);
  }

  private async fetchJourneyPoints(searchTerm: string) {
    let stageConfig = this.userTripService.getStageConfig()

    const request = OJP.LocationInformationRequest.initWithLocationName(stageConfig, searchTerm, []);
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
    const tripLocationPoint = this.endpointType === 'From' ? this.userTripService.fromTripLocation : this.userTripService.toTripLocation
    const location = tripLocationPoint?.location ?? null;
    this.mapService.tryToCenterAndZoomToLocation(location)
  }

  private handleCoordsPick(location: OJP.Location) {
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
    }
  }
}
