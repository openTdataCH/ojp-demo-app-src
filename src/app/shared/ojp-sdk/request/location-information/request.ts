import { XPathOJP } from '../../helpers/xpath-ojp';
import { Location } from '../../location/location';
import { OJPBaseRequest } from '../base-request'
import { LocationInformationRequestParams } from './request-params.interface'

export class LocationInformationRequest extends OJPBaseRequest {
  public requestParams: LocationInformationRequestParams

  constructor(requestParams: LocationInformationRequestParams) {
    super();
    this.requestParams = requestParams;
  }

  public static initWithLocationName(locationName: string): LocationInformationRequest {
    const requestParams = <LocationInformationRequestParams>{
      locationName: locationName
    }

    const locationInformationRequest = new LocationInformationRequest(requestParams);
    return locationInformationRequest
  }

  public fetchResponse(completion: (locations: Location[]) => void) {
    this.buildRequestNode();
    super.fetchOJPResponse(responseXML => {
      const locations: Location[] = [];

      const searchLocationNodes = XPathOJP.queryNodes('//ojp:OJPLocationInformationDelivery/ojp:Location', responseXML);
      searchLocationNodes.forEach(searchLocationNode  => {
        const locationNode = XPathOJP.queryNode('ojp:Location', searchLocationNode);
        if (locationNode === null) {
          return;
        }

        const location = new Location(locationNode);
        locations.push(location);
      });

      completion(locations);
    });
  }

  private buildRequestNode() {
    const requestNode = this.serviceRequestNode.ele('ojp:OJPLocationInformationRequest');

    const locationName = this.requestParams.locationName ?? null;
    if (locationName) {
      requestNode.ele('ojp:InitialInput').ele('ojp:LocationName', locationName);
    }

    // requestNode.ele('ojp:Restrictions').ele('ojp:Type', 'stop');
    requestNode.ele('ojp:Restrictions').ele('ojp:NumberOfResults', 10);
  }

}
