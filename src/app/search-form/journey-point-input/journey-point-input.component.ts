import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroupDirective, NgForm, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators'

import { SbbAutocompleteSelectedEvent } from '@sbb-esta/angular/autocomplete';
import { SbbErrorStateMatcher } from '@sbb-esta/angular/core';

import * as OJP_Types from 'ojp-shared-types';
import * as OJP_Next from 'ojp-sdk-next';

import { OJP_VERSION } from '../../config/constants';

import { MapService } from '../../shared/services/map.service';
import { LanguageService } from '../../shared/services/language.service'
import { UserTripService } from '../../shared/services/user-trip.service';
import { AnyPlace, PlaceBuilder } from '../../shared/models/place/place-builder';
import { PlaceLocation } from '../../shared/models/place/location';
import { OJPHelpers } from '../../helpers/ojp-helpers';
import { AnyLocationInformationRequest } from '../../shared/types/_all';
import { GeoPositionBBOX } from '../../shared/models/geo/geoposition-bbox';

interface RenderPlaceResult {
  place: AnyPlace,
  type: 'around_me' | 'place',
  caption: string,
  distance?: number,
};

const AroundMePlaceResult: RenderPlaceResult = (() => {
  const place = PlaceLocation.Empty('Current Location');

  const placeResult: RenderPlaceResult = {
    place: place,
    type: 'around_me',
    caption: place.placeName,
  };

  return placeResult;
})();

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
export class JourneyPointInputComponent implements OnInit {

  private ignoreInputChanges: boolean;

  public inputControl: FormControl;

  public mapLookupPlaces: MapPlaces;
  public optionLocationTypes: OptionLocationType[];

  @Input() placeholder: string = '';
  @Input() filterPlaceType: OJP_Types.PlaceTypeEnum | undefined;
  
  private _currentRenderPlaceResult: RenderPlaceResult | null = null;
  @Input() set place(place: AnyPlace | null) {
    if (place) {
      const placeName = place.computeName();
      this.inputControl.setValue(placeName, { emitEvent: false });

      this._currentRenderPlaceResult = {
        place: place,
        type: 'place',
        caption: placeName,
      };
    } else {
      this._currentRenderPlaceResult = null;
    }
  }

  @Output() selectedNewPlace = new EventEmitter<AnyPlace>();

  public useSingleSearchPool: boolean;

  private sdk: OJP_Next.AnySDK; 

  constructor(private mapService: MapService, private userTripService: UserTripService, private languageService: LanguageService) {
    this.ignoreInputChanges = false;
    
    this.inputControl = new FormControl('', [Validators.required]);

    this.mapLookupPlaces = {} as MapPlaces;
    this.resetMapPlaces();

    this.optionLocationTypes = [
      ['stop', 'Stops'],
      ['poi', 'POIs'],
      ['topographicPlace', 'Topographic Places'],
      ['address', 'Addresses'],
    ];

    this.place = null;

    this.useSingleSearchPool = this.filterPlaceType !== undefined;

    this.sdk = this.userTripService.createOJP_SDK_Instance(this.languageService.language);
  }

  ngOnInit() {
    this.inputControl.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe((_) => {
      this.onInputChangeAfterIdle();
    });
  }

  private onInputChangeAfterIdle() {
    if (this._currentRenderPlaceResult?.type === 'around_me') {
      return;
    }

    const searchTerm = this.inputControl.value.trim();

    if (this.ignoreInputChanges) {
      return;
    }

    if (searchTerm.trim().length < 1) {
      this.useSingleSearchPool = true;
      
      this.resetMapPlaces();
      this.mapLookupPlaces['stop'] = [AroundMePlaceResult];

      return;
    }

    this.useSingleSearchPool = this.filterPlaceType !== undefined;

    const coordsPlace = PlaceLocation.initFromLiteralCoords(searchTerm);
    if (coordsPlace) {
      this.resetMapPlaces();
      this.handleSelectedPlace(coordsPlace);
      return;
    }
    
    this.fetchJourneyPoints(searchTerm);
  }

  onOpenAutocomplete() {
    this.ignoreInputChanges = false;
  }

  onOptionSelected(ev: SbbAutocompleteSelectedEvent) {
    const optionIdParts = ev.option.value.split('.');
    if (optionIdParts.length !== 2) {
      return;
    }
    
    const placeType = optionIdParts[0] as OJP_Types.PlaceTypeEnum;
    const itemIdx = parseInt(optionIdParts[1], 10);
    const placeResult = this.mapLookupPlaces[placeType][itemIdx];

    this._currentRenderPlaceResult = placeResult;

    if (placeResult.type === 'around_me') {
      this.handleGeolocationLookup();
    } else {
      const place = placeResult.place;
      this.handleSelectedPlace(place);
    }
  }

  private async fetchJourneyPoints(searchTerm: string) {
    const placeTypes = this.filterPlaceType === undefined ? undefined : [this.filterPlaceType];
    const request = this.sdk.requests.LocationInformationRequest.initWithLocationName(searchTerm, placeTypes, 10);

    await this.fetchRequest(request);
  }

  private async fetchRequest(request: AnyLocationInformationRequest) {
    const response = await request.fetchResponse(this.sdk);

    if (!response.ok) {
      console.log('ERROR - failed to lookup locations');
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
    if (this.place) {
      this.mapService.tryToCenterAndZoomToPlace(this.place);
    }
  }

  private handleSelectedPlace(place: AnyPlace) {
    // use ignoreInputChanges, otherwise emitEvent: false will not work with debounceTime()
    this.ignoreInputChanges = true;
    this.inputControl.setValue(place.computeName(), { emitEvent: false });
    
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

  private handleGeolocationLookup() {
    if (!navigator.geolocation) {
      console.error('no navigator.geolocation enabled')
      return;
    }
    
    // use ignoreInputChanges, otherwise emitEvent: false will not work with debounceTime()
    this.ignoreInputChanges = true;
    this.inputControl.setValue('... looking up location', { emitEvent: false });

    navigator.geolocation.getCurrentPosition(
      async position => {
        await this.handleNewGeoPosition(position);

        this.ignoreInputChanges = false;
        this.inputControl.setValue('... choose nearby stop', { emitEvent: false });
      },
      error => {
        this.ignoreInputChanges = false;
        this.inputControl.setValue('... Geolocation ERROR: ' + error.message, { emitEvent: false });

        console.error('GeoLocation ERROR');
        console.log(error);
      },
      {
        enableHighAccuracy: false,
        timeout: 15 * 1000,
        maximumAge: 60 * 60 * 1000,
      }
    );
  }

  private async handleNewGeoPosition(position: GeolocationPosition) {
    const nearbyGeoPosition = new OJP_Next.GeoPosition(position.coords.longitude, position.coords.latitude);
    const bbox = GeoPositionBBOX.initFromGeoPosition(nearbyGeoPosition, 5000, 5000);
    const bboxData = bbox.asFeatureBBOX();

    const request = this.sdk.requests.LocationInformationRequest.initWithBBOX(bboxData, ['stop'], 300);

    await this.fetchRequest(request);

    const stopPlaces = this.mapLookupPlaces['stop'];
    if (stopPlaces.length === 0) {
      return;
    }

    stopPlaces.forEach(placeResult => {
      placeResult.distance = placeResult.place.geoPosition.distanceFrom(nearbyGeoPosition);
      placeResult.caption = placeResult.caption + ' (' + placeResult.distance + ' m)';
    });

    // Sort by distance if needed
    stopPlaces.sort((a, b) => {
      if (a.distance === null || a.distance === undefined) {
        return 0;
      }
      if (b.distance === null || b.distance === undefined) {
        return 0;
      }
      return a.distance - b.distance;
    });

    this.mapLookupPlaces['stop'] = stopPlaces.slice(0, 10);
  }
}
