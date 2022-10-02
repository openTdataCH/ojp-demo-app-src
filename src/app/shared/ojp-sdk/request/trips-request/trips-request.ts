import { JourneyPointType } from '../../types/journey-points';
import { OJPBaseRequest } from '../base-request';
import { TripsRequestParams } from './trips-request-params';
import { TripsResponse } from '../../trips/trips-response'
import { StageConfig } from '../../types/stage-config';
import { RequestErrorData } from './../request-error'
import { IndividualTransportMode } from '../../types/individual-mode.types';

export class TripRequest extends OJPBaseRequest {
  public requestParams: TripsRequestParams

  constructor(stageConfig: StageConfig, requestParams: TripsRequestParams) {
    super(stageConfig);
    this.requestParams = requestParams;
  }

  public fetchResponse(completion: (response: TripsResponse, error: RequestErrorData | null) => void) {
    this.buildTripRequestNode();
    const bodyXML_s = this.serviceRequestNode.end();
    super.fetchOJPResponse(bodyXML_s, (responseText, errorData) => {
      const tripsResponse = TripsResponse.initWithXML(responseText, this.requestParams.transportMode);
      if (errorData === null && !tripsResponse.hasValidResponse) {
        errorData = {
          error: 'ParseTripsXMLError',
          message: 'Invalid TripsRequest Response XML'
        }
      }
      completion(tripsResponse, errorData);
    });
  }

  public computeRequestXmlString(): string {
    this.buildTripRequestNode();

    let bodyXML_s = this.serviceRequestNode.end({
      pretty: true
    });

    return bodyXML_s;
  }

  private buildTripRequestNode() {
    const now = new Date()
    const dateF = now.toISOString();
    this.serviceRequestNode.ele('RequestTimestamp', dateF)

    const tripRequestNode = this.serviceRequestNode.ele('ojp:OJPTripRequest');
    tripRequestNode.ele('RequestTimestamp', dateF)

    const tripEndpoints: JourneyPointType[] = ["From", "To"]
    tripEndpoints.forEach(tripEndpoint => {
      const isFrom = tripEndpoint === 'From';
      const tripLocation = isFrom ? this.requestParams.fromTripLocation : this.requestParams.toTripLocation;
      const location = tripLocation.location;

      let tagName = isFrom ? 'Origin' : 'Destination';

      const endPointNode = tripRequestNode.ele('ojp:' + tagName);
      const placeRefNode = endPointNode.ele('ojp:PlaceRef');

      if (location.stopPlace?.stopPlaceRef) {
        const locationName = location.locationName ?? 'n/a'
        
        let stopPlaceRef = location.stopPlace?.stopPlaceRef ?? ''

        placeRefNode.ele('StopPointRef', stopPlaceRef);
        placeRefNode.ele('ojp:LocationName').ele('ojp:Text', locationName)
      } else {
        if (location.geoPosition) {
          const geoPositionNode = placeRefNode.ele('ojp:GeoPosition')
          geoPositionNode.ele('Longitude', location.geoPosition.longitude)
          geoPositionNode.ele('Latitude', location.geoPosition.latitude)

          const locationName = location.geoPosition.asLatLngString()
          placeRefNode.ele('ojp:LocationName').ele('ojp:Text', locationName)
        }
      }

      if (isFrom) {
        const dateF = this.requestParams.departureDate.toISOString();
        endPointNode.ele('ojp:DepArrTime', dateF);
      }
    });

    const paramsNode = tripRequestNode.ele('ojp:Params');

    const numberOfResults = this.computeNumberOfResultsParam();
    paramsNode.ele('ojp:NumberOfResults', numberOfResults);

    paramsNode.ele('ojp:IncludeTrackSections', true)
    paramsNode.ele('ojp:IncludeLegProjection', true)
    paramsNode.ele('ojp:IncludeTurnDescription', true)
    paramsNode.ele('ojp:IncludeIntermediateStops', true)

    const modeType = this.requestParams.modeType
    const transportMode = this.requestParams.transportMode

    if (modeType === 'monomodal') {
      if (transportMode === 'walking') {
        paramsNode.ele('ojp:ItModesToCover', 'walk');
      }

      if (transportMode === 'car_self_driving') {
        paramsNode.ele('ojp:ItModesToCover', 'self-drive-car');
      }

      if (transportMode === 'cycle') {
        paramsNode.ele('ojp:ItModesToCover', 'cycle');
      } 

      const sharingModes: IndividualTransportMode[] = ['bicycle_rental', 'car_sharing', 'escooter_rental'];
      const isSharing = sharingModes.indexOf(transportMode) !== -1;
      if (isSharing) {
        const paramsExtensionNode = paramsNode.ele('ojp:Extension');
        paramsExtensionNode.ele('ojp:ItModesToCover', transportMode);
      }
    } else {
      const paramsExtensionNode = paramsNode.ele('ojp:Extension');
      
      tripEndpoints.forEach(tripEndpoint => {
        const isFrom = tripEndpoint === 'From';
        if (isFrom && this.requestParams.modeType === 'mode_at_end') {
          return;
        }
        if (!isFrom && this.requestParams.modeType === 'mode_at_start') {
          return;
        }
        
        const tripLocation = isFrom ? this.requestParams.fromTripLocation : this.requestParams.toTripLocation;
        
        let tagName = isFrom ? 'Origin' : 'Destination';
        const endpointNode = paramsExtensionNode.ele('ojp:' + tagName);
  
        endpointNode.ele('ojp:MinDuration', 'PT' + tripLocation.minDuration + 'M')
        endpointNode.ele('ojp:MaxDuration', 'PT' + tripLocation.maxDuration + 'M')
        endpointNode.ele('ojp:MinDistance', tripLocation.minDistance)
        endpointNode.ele('ojp:MaxDistance', tripLocation.maxDistance)
  
        if (tripLocation.customTransportMode) {
          endpointNode.ele('ojp:Mode', tripLocation.customTransportMode)
        }
      });
    }
  }

  private computeNumberOfResultsParam(): number {
    if (this.stageConfig.key === 'TEST LA') {
      return 1;
    }

    if (this.requestParams.modeType === 'monomodal') {
      const customModes: IndividualTransportMode[] = ['walking', 'cycle', 'car_self_driving', 'bicycle_rental', 'escooter_rental', 'car_sharing'];
      const isCustomMode = customModes.indexOf(this.requestParams.transportMode) !== -1;
      if (isCustomMode) {
        return 0;
      }
    }

    return 5;
  }
}
