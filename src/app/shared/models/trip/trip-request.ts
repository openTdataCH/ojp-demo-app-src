import { DomSanitizer } from '@angular/platform-browser';

import * as OJP_Types from 'ojp-shared-types';
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
    
    const isAdvanced = userTripService.isAdditionalRestrictionsEnabled === true;

    const sharedMobilityTransportModes: IndividualTransportMode[] = [
      "bicycle_rental",
      "car_sharing",
      "escooter_rental",
    ];
    const isSharingMode = sharedMobilityTransportModes.indexOf(userTripService.tripTransportMode) !== -1;
    const isWalking = userTripService.tripTransportMode === 'walk' || userTripService.tripTransportMode === 'foot';
    const isPublicTransport = userTripService.tripTransportMode === 'public_transport';
    
    const taxiTransportMode = (() => {
      if (userTripService.tripTransportMode === 'others-drive-car') {
        return 'others-drive-car';
      }
      if (userTripService.tripTransportMode === 'taxi') {
        return 'taxi';
      }

      return null;
    })();

    // ALL CAR modes EXCEPT car_sharing + 'others-drive-car'
    const ownCarModes: IndividualTransportMode[] = ['car', 'self-drive-car'];
    const isOwnCar = ownCarModes.indexOf(userTripService.tripTransportMode) !== -1;

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

    // OJP 2.0 only params
    if (isOJPv2) {
      const requestOJPv2 = request as OJP.TripRequest;

      // NumberOfResults = 0 for sharing / walking in OJP v2.0
      if (!isAdvanced && (isSharingMode || isWalking)) {
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

        if (userTripService.useBikeTransport) {
          requestOJPv2.payload.params.bikeTransport = true;
        }
      }
    }

    if (isWalking) {
      request.setWalkRequest();
    }

    const personalModeRestriction: OJP_Types.PersonalModesOfOperationEnum = (() => {
      if (isSharingMode) {
        return 'lease';
      }

      const defaultMode: OJP_Types.PersonalModesOfOperationEnum = 'own';
      return defaultMode;
    })();

    const transportModeRestriction: OJP_Types.PersonalModesEnum = (() => {
      if (isWalking) {
        return 'foot';
      }

      if (userTripService.tripTransportMode === 'cycle') {
        return 'bicycle';
      }

      if (userTripService.tripTransportMode === 'bicycle_rental') {
        return 'bicycle';
      }

      if (userTripService.tripTransportMode === 'escooter_rental') {
        return 'scooter';
      }

      if (userTripService.tripTransportMode === 'car_sharing') {
        return 'car';
      }
      if (userTripService.tripTransportMode === 'self-drive-car') {
        return 'car';
      }
      if (userTripService.tripTransportMode === 'others-drive-car') {
        return 'car';
      }

      const defaultMode: OJP_Types.PersonalModesEnum = 'other';
      return defaultMode;
    })();

    const isOwnBicycle = userTripService.tripTransportMode === 'cycle';

    if (isAdvanced) {
      if (isOJPv2) {
        // OJP 2.0

        if (userTripService.tripModeType !== 'mode_at_end') {
          // in advanced mode, set Origin/Destination with what is enabled in the GUI
          request.setOriginDurationDistanceRestrictions(
            personalModeRestriction,
            transportModeRestriction,
            userTripService.fromTripPlace?.minDuration, 
            userTripService.fromTripPlace?.maxDuration, 
            userTripService.fromTripPlace?.minDistance, 
            userTripService.fromTripPlace?.maxDistance
          );
        }

        if (userTripService.tripModeType !== 'mode_at_start') {
          // dont set Destination for Walk monomodal
          if (!isWalking) {
            request.setDestinationDurationDistanceRestrictions(
              personalModeRestriction,
              transportModeRestriction,
              userTripService.toTripPlace?.minDuration, 
              userTripService.toTripPlace?.maxDuration, 
              userTripService.toTripPlace?.minDistance, 
              userTripService.toTripPlace?.maxDistance
            );
          }
        }
      } else {
        // OJP 1.0

        if (isOwnBicycle || isSharingMode) {
          if (userTripService.tripModeType !== 'mode_at_end') {
            request.setOriginDurationDistanceRestrictions(
              personalModeRestriction,
              transportModeRestriction,
              userTripService.fromTripPlace?.minDuration,
              userTripService.fromTripPlace?.maxDuration, 
              userTripService.fromTripPlace?.minDistance, 
              userTripService.fromTripPlace?.maxDistance,
            );
          }
          if (userTripService.tripModeType !== 'mode_at_start') {
            request.setDestinationDurationDistanceRestrictions(
              personalModeRestriction,
              transportModeRestriction,
              userTripService.toTripPlace?.minDuration,
              userTripService.toTripPlace?.maxDuration, 
              userTripService.toTripPlace?.minDistance, 
              userTripService.toTripPlace?.maxDistance,
            );
          }
        }

        if (taxiTransportMode !== null) {
          if (userTripService.tripModeType !== 'mode_at_end') {
            request.setTaxiRequest(
              taxiTransportMode,
              'origin', 
              userTripService.fromTripPlace?.minDuration,
              userTripService.fromTripPlace?.maxDuration, 
              userTripService.fromTripPlace?.minDistance, 
              userTripService.fromTripPlace?.maxDistance,
            );
          }
          
          if (userTripService.tripModeType !== 'mode_at_start') {
            request.setTaxiRequest(
              taxiTransportMode,
              'destination',
              userTripService.toTripPlace?.minDuration,
              userTripService.toTripPlace?.maxDuration, 
              userTripService.toTripPlace?.minDistance, 
              userTripService.toTripPlace?.maxDistance,
            );
          }
        }
      }
    } else {
      // simple mode (advanced == colapsed)

      if (isOwnBicycle || isSharingMode) {
        request.setMonomodalRequest(personalModeRestriction, transportModeRestriction);
      }

      if (taxiTransportMode !== null) {
        request.setTaxiRequest(taxiTransportMode);
      }

      if (isOJPv2) {
        // in mono-modal, for walking, set max walk time
        if (isWalking) {
          const maxDuration = 60 * 5; // 5 hrs
          request.setOriginDurationDistanceRestrictions(
            personalModeRestriction,
            'foot',
            null, 
            maxDuration, 
            null, 
            null,
          );
        }
      }
    }

    if (userTripService.walkSpeedDeviation !== null) {
      request.setWalkSpeedDeviation(userTripService.walkSpeedDeviation);
    }

    // Own Car BUT NOT car sharing (handled above)
    if (isOwnCar) {
      request.setCarRequest();
      request.setNumberOfResults(null);
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

