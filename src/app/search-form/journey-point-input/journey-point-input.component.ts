import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { SbbAutocompleteSelectedEvent } from '@sbb-esta/angular-business/autocomplete';

import { debounceTime, distinctUntilChanged } from 'rxjs/operators'

import * as OJP from '../../shared/ojp-sdk/index'

@Component({
  selector: 'journey-point-input',
  templateUrl: './journey-point-input.component.html',
  styleUrls: ['./journey-point-input.component.scss']
})
export class JourneyPointInputComponent implements OnInit {
  lookupLocations: OJP.Location[];
  inputControl = new FormControl('');
  private shouldFetch = true

  @Input() placeholder: string = '';
  @Output() selectedLocation = new EventEmitter<OJP.Location>()

  constructor() {
    this.lookupLocations = []
  }

  ngOnInit() {
    this.inputControl.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe((searchTerm: string) => {
      if (!this.shouldFetch) {
        return
      }

      if (searchTerm.length < 2) {
        return;
      }

      this.fetchJourneyPoints(searchTerm);
    });
  }

  onOpenAutocomplete() {
    this.shouldFetch = true
  }

  onOptionSelected(ev: SbbAutocompleteSelectedEvent) {
    this.shouldFetch = false

    const optionIdx = ev.option.value;
    const location = this.lookupLocations[optionIdx];

    const inputValue = this.computeLocationName(location);
    this.inputControl.setValue(inputValue);

    this.selectedLocation.emit(location);
  }

  hasValue(): boolean {
    return this.inputControl.value.trim() !== ''
  }

  public computeLocationName(location: OJP.Location): string {
    if (location.stopPlace) {
      return location.stopPlace.stopPlaceName
    }

    return location.locationName ?? 'n/a'
  }

  private fetchJourneyPoints(searchTerm: string) {
    const locationInformationRequest = OJP.LocationInformationRequest.initWithLocationName(searchTerm);

    locationInformationRequest.fetchResponse((locations: OJP.Location[]) => {
      this.lookupLocations = locations;
    });
  }
}
