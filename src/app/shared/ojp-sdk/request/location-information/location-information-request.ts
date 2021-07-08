import xmlbuilder from 'xmlbuilder';

import { StageConfig } from '../../config/config'
import { XPathOJP } from '../../helpers/xpath-ojp';
import { Location } from '../../location/location';
import { GeoRestrictionPoiOSMTag, GeoRestrictionType } from '../../types/geo-restriction.type';
import { OJPBaseRequest } from '../base-request'
import { LocationInformationRequestParams } from './location-information-request-params.interface'

export class LocationInformationRequest extends OJPBaseRequest {
  public requestParams: LocationInformationRequestParams

  constructor(stageConfig: StageConfig, requestParams: LocationInformationRequestParams) {
    super(stageConfig);
    this.requestParams = requestParams;
  }

  public static initWithLocationName(stageConfig: StageConfig, locationName: string): LocationInformationRequest {
    const requestParams = <LocationInformationRequestParams>{
      locationName: locationName
    }

    const locationInformationRequest = new LocationInformationRequest(stageConfig, requestParams);
    return locationInformationRequest
  }

  public static initWithStopPlaceRef(stageConfig: StageConfig, stopPlaceRef: string): LocationInformationRequest {
    const requestParams = <LocationInformationRequestParams>{
      stopPlaceRef: stopPlaceRef
    }

    const locationInformationRequest = new LocationInformationRequest(stageConfig, requestParams);
    return locationInformationRequest
  }

  public static initWithBBOXAndType(
    stageConfig: StageConfig,
    bboxWest: number,
    bboxNorth: number,
    bboxEast: number,
    bboxSouth: number,
    geoRestrictionType: GeoRestrictionType,
    limit: number = 1000,
    poiOsmTag: GeoRestrictionPoiOSMTag | null = null
  ): LocationInformationRequest {
    const requestParams = <LocationInformationRequestParams>{
      bboxWest: bboxWest,
      bboxNorth: bboxNorth,
      bboxEast: bboxEast,
      bboxSouth: bboxSouth,
      numberOfResults: limit,
      geoRestrictionType: geoRestrictionType,
      poiOsmTag: poiOsmTag
    }

    const locationInformationRequest = new LocationInformationRequest(stageConfig, requestParams);
    return locationInformationRequest
  }

  public fetchResponse(): Promise<Location[]> {
    this.buildRequestNode();

    const loadingPromise = new Promise<Location[]>((resolve, reject) => {
      super.fetchOJPResponse(responseText => {
        const responseXML = new DOMParser().parseFromString(responseText, 'application/xml');

        const locations: Location[] = [];

        const responseStatus = XPathOJP.queryText('//ojp:OJPLocationInformationDelivery/siri:Status', responseXML)
        const hasErrors = responseStatus === 'false';
        if (hasErrors) {
          const errorNode = XPathOJP.queryNode('//ojp:OJPLocationInformationDelivery/siri:ErrorCondition', responseXML)

          console.error('OJP LocationInformationRequest error');
          console.log(errorNode);

          resolve(locations);
          return;
        }

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

    let initialInputNode: xmlbuilder.XMLElement | null = null

    const locationName = this.requestParams.locationName ?? null;
    if (locationName) {
      initialInputNode = requestNode.ele('ojp:InitialInput')
      initialInputNode.ele('ojp:LocationName', locationName);
    }

    const stopPlaceRef = this.requestParams.stopPlaceRef ?? null;
    if (stopPlaceRef) {
      requestNode.ele('ojp:PlaceRef').ele('ojp:StopPlaceRef', stopPlaceRef);
    }

    const bboxWest = this.requestParams.bboxWest ?? null;
    const bboxNorth = this.requestParams.bboxNorth ?? null;
    const bboxEast = this.requestParams.bboxEast ?? null;
    const bboxSouth = this.requestParams.bboxSouth ?? null;
    if (bboxWest && bboxNorth && bboxEast && bboxSouth) {
      if (initialInputNode === null) {
        initialInputNode = requestNode.ele('ojp:InitialInput')
      }

      const rectangleNode = initialInputNode.ele('ojp:GeoRestriction').ele('ojp:Rectangle')

      const upperLeftNode = rectangleNode.ele('ojp:UpperLeft')
      upperLeftNode.ele('Longitude', bboxWest.toFixed(6))
      upperLeftNode.ele('Latitude', bboxNorth.toFixed(6))

      const lowerRightNode = rectangleNode.ele('ojp:LowerRight')
      lowerRightNode.ele('Longitude', bboxEast.toFixed(6))
      lowerRightNode.ele('Latitude', bboxSouth.toFixed(6))
    }

    const restrictionsNode = requestNode.ele('ojp:Restrictions');

    const numberOfResults = this.requestParams.numberOfResults ?? 10;
    restrictionsNode.ele('ojp:NumberOfResults', numberOfResults);

    const geoRestrictionType = this.requestParams.geoRestrictionType ?? null;
    if (geoRestrictionType) {
      restrictionsNode.ele('ojp:Type', geoRestrictionType);

      if (this.requestParams.poiOsmTag) {
        const osmTagNode = restrictionsNode.ele('ojp:PointOfInterestFilter').ele('ojp:PointOfInterestCategory').ele('ojp:OsmTag')
        osmTagNode.ele('ojp:Tag', this.requestParams.poiOsmTag)
        osmTagNode.ele('ojp:Value', 'yes')
      }
    }
  }

}
