import * as OJP from 'ojp-sdk';

import { EMPTY_HTTPConfig, REQUESTOR_REF } from '../../config/constants';
import { JourneyPointInputComponent } from '../../search-form/journey-point-input/journey-point-input.component';
import { PlaceLocation } from '../models/place/location';
import { TripRequestBuilder } from '../models/trip/trip-request';
import { LanguageService } from './language.service';
import { UserTripService } from './user-trip.service';

describe('Via stop state', () => {
  let service: UserTripService;
  const via = new PlaceLocation(8.54, 47.38, 'Via');

  beforeEach(() => {
    service = new UserTripService(new LanguageService());
    service.updateTripEndpoint(new PlaceLocation(7.44, 46.95), 'From', 'SearchForm');
    service.updateTripEndpoint(new PlaceLocation(9.37, 47.42), 'To', 'SearchForm');
  });

  function request() {
    const sdk = OJP.SDK.v2(REQUESTOR_REF, EMPTY_HTTPConfig, 'en');
    return TripRequestBuilder.computeTripRequest(service, sdk)!;
  }

  function params() {
    return new URL(service.permalinkRelativeURL!, document.location.origin).searchParams;
  }

  it('opens an empty via field without adding a via to the request', () => {
    service.updateVia();
    expect(service.isViaEnabled).toBeTrue();
    expect(service.viaTripLocations).toEqual([]);
    expect(request().payload.via?.length ?? 0).toBe(0);
    expect(params().has('via')).toBeFalse();
  });

  it('removes the via and dwell time from state, URLs and requests when disabled', () => {
    service.updateTripEndpoint(via, 'Via', 'SearchForm');
    service.viaTripLocations[0].dwellTimeMinutes = 10;
    service.updateURLs();
    expect(params().get('via_dwell_time')).toBe('10');
    expect(request().payload.via?.length).toBe(1);

    service.updateVia();
    expect(service.isViaEnabled).toBeFalse();
    expect(service.viaTripLocations).toEqual([]);
    expect(params().has('via')).toBeFalse();
    expect(params().has('via_dwell_time')).toBeFalse();
    expect(request().payload.via?.length ?? 0).toBe(0);

    service.updateVia();
    service.updateTripEndpoint(via, 'Via', 'SearchForm');
    expect(service.viaTripLocations[0].dwellTimeMinutes).toBeNull();
  });

  it('clears the selected via through the input clear event while keeping the field open', () => {
    service.updateTripEndpoint(via, 'Via', 'SearchForm');
    const input = new JourneyPointInputComponent(null!, service, new LanguageService());
    input.place = via;
    input.placeCleared.subscribe(() => service.updateTripEndpoint(null, 'Via', 'SearchForm'));

    input.clearInputText();
    expect(input.inputControl.value).toBe('');
    expect(service.isViaEnabled).toBeTrue();
    expect(service.viaTripLocations).toEqual([]);
    expect(params().has('via')).toBeFalse();
    expect(params().has('via_dwell_time')).toBeFalse();
    expect(request().payload.via?.length ?? 0).toBe(0);
  });

  it('clears the displayed text when its selected place is removed externally', () => {
    const input = new JourneyPointInputComponent(null!, service, new LanguageService());
    input.place = via;
    input.place = null;
    expect(input.inputControl.value).toBe('');
  });

  it('excludes disabled via stops from requests even if stale locations remain', () => {
    service.updateTripEndpoint(via, 'Via', 'SearchForm');
    service.isViaEnabled = false;
    expect(request().payload.via?.length ?? 0).toBe(0);
  });
});
