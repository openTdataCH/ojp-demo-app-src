import { XPathOJP } from '../../helpers/xpath-ojp';
import { Location } from '../../location/location';
import { OJPBaseRequest } from '../base-request'
import { LocationInformationRequestParams } from './location-information-request-params.interface'

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

  public static initWithStopPlaceRef(stopPlaceRef: string): LocationInformationRequest {
    const requestParams = <LocationInformationRequestParams>{
      stopPlaceRef: stopPlaceRef
    }

    const locationInformationRequest = new LocationInformationRequest(requestParams);
    return locationInformationRequest
  }

  public fetchResponse(): Promise<Location[]> {
    this.buildRequestNode();

    const loadingPromise = new Promise<Location[]>((resolve, reject) => {
      super.fetchOJPResponse(responseText => {
        const responseXML = new DOMParser().parseFromString(responseText, 'application/xml');

        const locations: Location[] = [];

        const searchLocationNodes = XPathOJP.queryNodes('//ojp:OJPLocationInformationDelivery/ojp:Location', responseXML);
        searchLocationNodes.forEach(searchLocationNode  => {
          const locationNode = XPathOJP.queryNode('ojp:Location', searchLocationNode);
          if (locationNode === null) {
            return;
          }

          const location = Location.initWithOJPContextNode(locationNode)
          locations.push(location);
        });

        resolve(locations);
      });
    });

    return loadingPromise;
  }

  private buildRequestNode() {
    const requestNode = this.serviceRequestNode.ele('ojp:OJPLocationInformationRequest');

    const locationName = this.requestParams.locationName ?? null;
    if (locationName) {
      requestNode.ele('ojp:InitialInput').ele('ojp:LocationName', locationName);
    }

    const stopPlaceRef = this.requestParams.stopPlaceRef ?? null;
    if (stopPlaceRef) {
      requestNode.ele('ojp:PlaceRef').ele('ojp:StopPlaceRef', stopPlaceRef);
    }

    requestNode.ele('ojp:Restrictions').ele('ojp:NumberOfResults', 10);
  }

}
