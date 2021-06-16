import { JourneyPointType } from '../../types/journey-points';
import { OJPBaseRequest } from '../base-request';
import { TripsRequestParams } from './trips-request-params';
import { TripsResponse } from '../../trips/trips-response'
import { StageConfig } from '../../config/config';

export class TripRequest extends OJPBaseRequest {
  public requestParams: TripsRequestParams

  constructor(stageConfig: StageConfig, requestParams: TripsRequestParams) {
    super(stageConfig);
    this.requestParams = requestParams;
  }

  public fetchResponse(completion: (response: TripsResponse) => void) {
    this.buildTripRequestNode();
    super.fetchOJPResponse(responseText => {
      this.handleResponse(responseText, completion);
    });
  }

  private handleResponse(responseText: string, completion: (response: TripsResponse) => void) {
    const tripsResponse = TripsResponse.initWithXML(responseText);
    completion(tripsResponse);
  }

  private buildTripRequestNode() {
    const tripRequestNode = this.serviceRequestNode.ele('ojp:OJPTripRequest');

    const tripEndpoints: JourneyPointType[] = ["From", "To"]
    tripEndpoints.forEach(tripEndpoint => {
      const isFrom = tripEndpoint === 'From';
      const location = isFrom ? this.requestParams.fromLocation : this.requestParams.toLocation;
      let tagName = isFrom ? 'Origin' : 'Destination';

      const endPointNode = tripRequestNode.ele('ojp:' + tagName);
      const placeRefNode = endPointNode.ele('ojp:PlaceRef');

      if (location.stopPlace?.stopPlaceRef) {
        const stopPlaceRef = location.stopPlace?.stopPlaceRef

        placeRefNode.ele('StopPointRef', stopPlaceRef);
      } else {
        if (location.geoPosition) {
          const geoPositionNode = placeRefNode.ele('ojp:GeoPosition')
          geoPositionNode.ele('Longitude',location.geoPosition.longitude)
          geoPositionNode.ele('Latitude',location.geoPosition.latitude)
        }
      }

      if (isFrom) {
        const dateF = this.requestParams.departureDate.toISOString();
        endPointNode.ele('obj:DepArrTime', dateF);
      }
    });
  }
}
