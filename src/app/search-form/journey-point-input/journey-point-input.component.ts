import { debounceTime, distinctUntilChanged } from 'rxjs/operators'
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormControl } from '@angular/forms';

import { SbbAutocompleteSelectedEvent } from '@sbb-esta/angular-business/autocomplete';

import * as OJP from '../../shared/ojp-sdk/index'
import { MapService } from 'src/app/shared/services/map.service';
import { UserTripService } from 'src/app/shared/services/user-trip.service';

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
  @Input() endpointType: OJP.JourneyPointType = 'From';
  @Input() inputValue: string = '';
  @Output() selectedLocation = new EventEmitter<OJP.Location>()

  constructor(private mapService: MapService, private userTripService: UserTripService) {
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

      const coordsLocation = OJP.Location.initFromLiteralCoords(searchTerm);
      if (coordsLocation) {
        this.lookupLocations = []
        this.handleCoordsPick(coordsLocation)
        return
      }

      this.fetchJourneyPoints(searchTerm);
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if ('inputValue' in changes) {
      const newInputValue = changes['inputValue'].currentValue;
      this.inputControl.setValue(newInputValue, { emitEvent: false });
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

  public computeLocationName(location: OJP.Location): string {
    if (location.stopPlace) {
      return location.stopPlace.stopPlaceName
    }

    return location.locationName ?? 'n/a'
  }

  private fetchJourneyPoints(searchTerm: string) {
    const stageConfig = this.userTripService.getStageConfig()
    const locationInformationRequest = OJP.LocationInformationRequest.initWithLocationName(stageConfig, searchTerm);

    locationInformationRequest.fetchResponse().then(locations => {
      this.lookupLocations = locations;
    });
  }

  public handleTapOnMapButton() {
    const location = this.endpointType === 'From' ? this.userTripService.fromLocation : this.userTripService.toLocation
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
}
