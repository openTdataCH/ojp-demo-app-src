import { DomSanitizer } from '@angular/platform-browser';

import * as OJP from 'ojp-sdk';

import { TripPlace } from "../trip-place";
import { StopPlace } from '../place/stop-place';
import { UserTripService } from '../../services/user-trip.service';
import { OJP_VERSION } from '../../../config/constants';
import { IndividualTransportMode } from '../../types/transport-mode';
import { Trip } from './trip';
import { OJPHelpers } from '../../../helpers/ojp-helpers';
import { AnyTripRequestResponse } from '../../types/_all';

export class TripRequestBuilder {
  public static computeTripRequest(userTripService: UserTripService, sdk: OJP.AnySDK, includeLegProjection: boolean = false) {
    if ((!userTripService.fromTripPlace) || (!userTripService.toTripPlace)) {
      return null;
    }

    const request = TripRequestBuilder.initWithTripPlaces(sdk, userTripService.fromTripPlace, userTripService.toTripPlace);
    if (includeLegProjection) {
      request.enableLinkProkection();
    }

    if (userTripService.currentBoardingType === 'Dep') {
      request.setDepartureDatetime(userTripService.departureDate);
    } else {
      request.setArrivalDatetime(userTripService.departureDate);
    }

    if (userTripService.viaTripLocations.length > 0) {
      const viaTripLocation = userTripService.viaTripLocations[0];
      const viaTripPlace = TripRequestBuilder.convertTripPlaceToSDKPlace(viaTripLocation);
      request.setViaPlace(viaTripPlace, viaTripLocation.dwellTimeMinutes);
    }

    const isOJPv2 = OJP_VERSION === '2.0';

    const sharingModes: IndividualTransportMode[] = [
      "bicycle_rental",
      "car_sharing",
      "escooter_rental",
    ];
    const isSharingMode = sharingModes.indexOf(userTripService.tripTransportMode) !== -1;
    const isWalking = userTripService.tripTransportMode === 'walk' || userTripService.tripTransportMode === 'foot';
    const isPublicTransport = userTripService.tripTransportMode === 'public_transport';

    request.setNumberOfResults(userTripService.numberOfResults);
    if (userTripService.numberOfResultsBefore !== null) {
      request.setNumberOfResultsBefore(userTripService.numberOfResultsBefore);
    }
    if (userTripService.numberOfResultsAfter !== null) {
      request.setNumberOfResultsAfter(userTripService.numberOfResultsAfter);
    }

    if (isPublicTransport) {
      request.setPublicTransportRequest(userTripService.publicTransportModesFilter);
    }

    if (isOJPv2) {
      const requestOJPv2 = request as OJP.TripRequest;

      // NumberOfResults = 0 for sharing / walking in OJP v2.0
      if (isSharingMode || isWalking) {
        requestOJPv2.setNumberOfResults(0);
      }

      if (requestOJPv2.payload.params) {
        requestOJPv2.payload.params.useRealtimeData = userTripService.useRealTimeDataType;
        
        if (isPublicTransport && (userTripService.railSubmodesFilter.length > 0)) {
          request.setRailSubmodes(userTripService.railSubmodesFilter);
        }

        if (userTripService.trOptimisationMethod !== null) {
          requestOJPv2.payload.params.optimisationMethod = userTripService.trOptimisationMethod;
        }
      }
    } 

    request.setOriginDurationDistanceRestrictions(
      userTripService.fromTripPlace?.minDuration, 
      userTripService.fromTripPlace?.maxDuration, 
      userTripService.fromTripPlace?.minDistance, 
      userTripService.fromTripPlace?.maxDistance
    );
    request.setDestinationDurationDistanceRestrictions(
      userTripService.toTripPlace?.minDuration, 
      userTripService.toTripPlace?.maxDuration, 
      userTripService.toTripPlace?.minDistance, 
      userTripService.toTripPlace?.maxDistance
    );

    if (userTripService.walkSpeedDeviation !== null) {
      request.setWalkSpeedDeviation(userTripService.walkSpeedDeviation);
    }

    return request;
  }

  private static convertTripPlaceToSDKPlace(tripPlace: TripPlace): OJP.Place {
    const place = OJP.Place.initWithCoords(tripPlace.place.geoPosition.longitude, tripPlace.place.geoPosition.latitude);
    
    if (tripPlace.place.type === 'stop') {
      const stopPlace = tripPlace.place as StopPlace;
      
      place.placeType = 'stop';
      place.name = {
          text: stopPlace.placeName
      };
      place.stopPlace = {
        stopPlaceRef: stopPlace.placeRef.ref,
        stopPlaceName: {
          text: stopPlace.placeRef.name,
        }
      };
    }

    return place;
  }

  private static initWithTripPlaces(sdk: OJP.AnySDK, fromTripPlace: TripPlace, toTripPlace: TripPlace) {
    const fromRequestPlace = TripRequestBuilder.convertTripPlaceToSDKPlace(fromTripPlace);
    const toRequestPlace = TripRequestBuilder.convertTripPlaceToSDKPlace(toTripPlace);

    const request = sdk.requests.TripRequest.initWithPlaces(fromRequestPlace, toRequestPlace);

    return request;
  }

  public static parseTrips(sanitizer: DomSanitizer, response: AnyTripRequestResponse): Trip[] {
    const trips: Trip[] = [];

    if (!response.ok) {
      return trips;
    }

    const tripResults = response.value.tripResult ?? [];
    const mapPlaces = OJPHelpers.parseAnyPlaceContext(OJP_VERSION, response.value.tripResponseContext);
    const mapSituations = OJPHelpers.parseAnySituationsContext(sanitizer, OJP_VERSION, response.value.tripResponseContext);
    
    tripResults.forEach(tripResultSchema => {
      const trip = Trip.initWithTripResultSchema(OJP_VERSION, tripResultSchema, mapPlaces, mapSituations);
      if (trip) {
        trips.push(trip);
      }
    });

    return trips;
  }
}

