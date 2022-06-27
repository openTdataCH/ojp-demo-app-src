import { XPathOJP } from '../../helpers/xpath-ojp';

import { StageConfig } from '../../config/config'
import { OJPBaseRequest } from '../base-request'
import { StopEvent } from '../../stop-event/stop-event';
import { Location } from '../../location/location'

import { StopEventRequestParams } from './stop-event-request-params';
import { RequestErrorData } from '../request-error';

export class StopEventRequest extends OJPBaseRequest {
    public requestParams: StopEventRequestParams

    constructor(stageConfig: StageConfig, requestParams: StopEventRequestParams) {
        requestParams.includePreviousCalls = true;
        requestParams.includeOnwardCalls = true;

        super(stageConfig);
        
        this.requestParams = requestParams;
    }

    fetchResponse(): Promise<StopEvent[]> {
        const bodyXML_s = this.requestParams.buildRequestXML(this.serviceRequestNode);

        const loadingPromise = new Promise<StopEvent[]>((resolve, reject) => {
            super.fetchOJPResponse(bodyXML_s, (responseText, errorData) => {
                const stopEvents = this.handleResponseData(responseText, errorData);
                resolve(stopEvents);
            });
        });

        return loadingPromise;
    }

    private handleResponseData(responseText: string, error: RequestErrorData | null): StopEvent[] {
        const stopEvents: StopEvent[] = [];

        const responseXML = new DOMParser().parseFromString(responseText, 'application/xml');

        const mapContextLocations = this.parseMapContextLocations(responseXML);

        const nodes = XPathOJP.queryNodes('//ojp:OJPStopEventDelivery/ojp:StopEventResult/ojp:StopEvent', responseXML);
        nodes.forEach(node => {
            const stopEvent = StopEvent.initFromContextNode(node);
            if (stopEvent) {
                stopEvent.patchStopEventLocations(mapContextLocations);
                stopEvents.push(stopEvent);
            }
        });

        return stopEvents;
    }

    private parseMapContextLocations(responseXML: Document): Record<string, Location> {
        const mapContextLocations: Record<string, Location> = {};

        const locationNodes = XPathOJP.queryNodes('//ojp:OJPStopEventDelivery/ojp:StopEventResponseContext/ojp:Places/ojp:Location', responseXML);
        locationNodes.forEach(locationNode => {
            const location = Location.initWithOJPContextNode(locationNode);
            const stopPlaceRef = location.stopPlace?.stopPlaceRef ?? null;
            if (stopPlaceRef) {
                mapContextLocations[stopPlaceRef] = location;
            }
        });

        return mapContextLocations;
    }

    public static initWithStopPlaceRef(stageConfig: StageConfig, stopPlaceRef: string): StopEventRequest {
        const stopEventRequestParams = new StopEventRequestParams(stopPlaceRef, null);
        const stopEventRequest = new StopEventRequest(stageConfig, stopEventRequestParams);
        return stopEventRequest;
    }
}
