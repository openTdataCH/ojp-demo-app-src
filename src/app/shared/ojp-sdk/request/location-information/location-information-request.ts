import xmlbuilder from 'xmlbuilder';

import { StageConfig } from '../../types/stage-config'
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
    poiOsmTags: GeoRestrictionPoiOSMTag[] | null = null
  ): LocationInformationRequest {
    const requestParams = <LocationInformationRequestParams>{
      bboxWest: bboxWest,
      bboxNorth: bboxNorth,
      bboxEast: bboxEast,
      bboxSouth: bboxSouth,
      numberOfResults: limit,
      geoRestrictionType: geoRestrictionType,
      poiOsmTags: poiOsmTags
    }

    const locationInformationRequest = new LocationInformationRequest(stageConfig, requestParams);
    return locationInformationRequest
  }

  public fetchResponse(): Promise<Location[]> {
    this.buildRequestNode();
    const bodyXML_s = this.serviceRequestNode.end();

    const loadingPromise = new Promise<Location[]>((resolve, reject) => {
      super.fetchOJPResponse(bodyXML_s, (responseText, errorData) => {
        const responseXML = new DOMParser().parseFromString(responseText, 'application/xml');

        const statusText = XPathOJP.queryText('//siri:OJPResponse/siri:ServiceDelivery/siri:Status', responseXML)
        const hasServiceStatusOK = statusText === 'true'

        const locations: Location[] = [];

        if (!hasServiceStatusOK) {
          if (errorData === null && !hasServiceStatusOK) {
            errorData = {
              error: 'ParseLocationInformationRequestXMLError',
              message: 'Invalid LocationInformationRequest Response XML'
            }
          }

          reject(errorData)
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
    const now = new Date()
    const dateF = now.toISOString();
    this.serviceRequestNode.ele('RequestTimestamp', dateF)

    const requestNode = this.serviceRequestNode.ele('ojp:OJPLocationInformationRequest');
    requestNode.ele('RequestTimestamp', dateF)

    let initialInputNode: xmlbuilder.XMLElement | null = null

    const locationName = this.requestParams.locationName ?? null;
    if (locationName) {
      initialInputNode = requestNode.ele('ojp:InitialInput')
      initialInputNode.ele('ojp:LocationName', locationName);
    }

    const stopPlaceRef = this.requestParams.stopPlaceRef ?? null;
    if (stopPlaceRef) {
      const requestPlaceRefNode = requestNode.ele('ojp:PlaceRef');
      requestPlaceRefNode.ele('ojp:StopPlaceRef', stopPlaceRef);
      requestPlaceRefNode.ele('ojp:LocationName').ele('ojp:Text', '');
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

    const geoRestrictionTypeS = this.computeRestrictionType();
    if (geoRestrictionTypeS) {
      restrictionsNode.ele('ojp:Type', geoRestrictionTypeS);

      const isPoiRequest = this.requestParams.geoRestrictionType === 'poi_amenity' || this.requestParams.geoRestrictionType === 'poi_all';
      if (isPoiRequest && this.requestParams.poiOsmTags) {
        const poiCategoryNode = restrictionsNode.ele('ojp:PointOfInterestFilter').ele('ojp:PointOfInterestCategory');
        const poiOsmTagKey = this.requestParams.geoRestrictionType === 'poi_amenity' ? 'amenity' : 'POI'
        
        this.requestParams.poiOsmTags.forEach(poiOsmTag => {
          const osmTagNode = poiCategoryNode.ele('ojp:OsmTag')
          osmTagNode.ele('ojp:Tag', poiOsmTagKey)
          osmTagNode.ele('ojp:Value', poiOsmTag)
        })
      }
    }
  }

  private computeRestrictionType(): string | null {
      if (this.requestParams.geoRestrictionType === 'poi_all') {
        return 'poi'
      }

      if (this.requestParams.geoRestrictionType === 'poi_amenity') {
        return 'poi'
      }

      return this.requestParams.geoRestrictionType;
  }
}
