import { JourneyPointType } from '../../types/journey-points';
import { OJPBaseRequest } from '../base-request';
import { TripsRequestParams } from './trips-request-params';
import { TripsResponse } from '../../trips/trips-response'
import { StageConfig } from '../../config/config';
import { RequestErrorData } from './../request-error'

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
      const tripsResponse = TripsResponse.initWithXML(responseText, this.requestParams.motType);
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
      const location = isFrom ? this.requestParams.fromLocation : this.requestParams.toLocation;
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

    const numberOfResults = 5;
    paramsNode.ele('ojp:NumberOfResults', numberOfResults);

    paramsNode.ele('ojp:IncludeTrackSections', true)
    paramsNode.ele('ojp:IncludeLegProjection', true)
    paramsNode.ele('ojp:IncludeTurnDescription', true)
    paramsNode.ele('ojp:IncludeIntermediateStops', true)

    const motType = this.requestParams.motType
    if (motType === 'Self-Driving Car') {
      paramsNode.ele('ojp:ItModesToCover', 'self-drive-car');
    }
    if (motType === 'Walking') {
      paramsNode.ele('ojp:ItModesToCover', 'walk');
    }
    if (motType === 'Shared Mobility') {
      paramsNode.ele('ojp:ItModesToCover', 'cycle');
    }
  }
}
