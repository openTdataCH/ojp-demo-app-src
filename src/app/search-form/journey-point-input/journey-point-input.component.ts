import { debounceTime, distinctUntilChanged } from 'rxjs/operators'
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormControl } from '@angular/forms';

import { SbbAutocompleteSelectedEvent } from '@sbb-esta/angular-business/autocomplete';

import * as OJP from '../../shared/ojp-sdk/index'

@Component({
  selector: 'journey-point-input',
  templateUrl: './journey-point-input.component.html',
  styleUrls: ['./journey-point-input.component.scss']
})
export class JourneyPointInputComponent implements OnInit, OnChanges {
  private shouldFetchNewData = true

  public inputControl = new FormControl('');
  public lookupLocations: OJP.Location[];

  @Input() placeholder: string = '';
  @Input() inputValue: string = '';
  @Output() selectedLocation = new EventEmitter<OJP.Location>()

  constructor() {
    this.lookupLocations = []
  }

  ngOnInit() {
    this.inputControl.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe((searchTerm: string) => {
      if (!this.shouldFetchNewData) {
        return
      }

      if (searchTerm.length < 2) {
        return;
      }

      this.fetchJourneyPoints(searchTerm);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if ('inputValue' in changes) {
      const newInputValue = changes['inputValue'].currentValue;
      this.inputControl.setValue(newInputValue);
    }
  }

  onOpenAutocomplete() {
    this.shouldFetchNewData = true
  }

  onOptionSelected(ev: SbbAutocompleteSelectedEvent) {
    this.shouldFetchNewData = false

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

    locationInformationRequest.fetchResponse().then(locations => {
      this.lookupLocations = locations;
    });
  }
}
