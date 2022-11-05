import xmlbuilder from 'xmlbuilder';

import { GeoPosition } from "../../location/geoposition"
import { StopEventType } from "../../types/stop-event-type"

export class StopEventRequestParams {
    public stopPlaceRef: string | null
    public geoPosition: GeoPosition | null
    public depArrTime: Date
    public numberOfResults: number
    public stopEventType: StopEventType
    public includePreviousCalls: boolean
    public includeOnwardCalls: boolean
    public includeRealtimeData: boolean

    constructor(stopPlaceRef: string | null, geoPosition: GeoPosition | null, stopEventType: StopEventType, stopEventDate: Date) {
        this.stopPlaceRef = stopPlaceRef;
        this.geoPosition = geoPosition;
        this.depArrTime = stopEventDate;
        this.numberOfResults = 10;
        this.stopEventType = stopEventType
        this.includePreviousCalls = false;
        this.includeOnwardCalls = false;
        this.includeRealtimeData = true;
    }

    public buildRequestXML(contextEl: xmlbuilder.XMLElement): string {
        const dateNowF = new Date().toISOString();
        const dateF = this.depArrTime.toISOString();
        
        contextEl.ele('RequestTimestamp', dateNowF);

        const requestNode = contextEl.ele('ojp:OJPStopEventRequest');
        requestNode.ele('RequestTimestamp', dateNowF);

        const locationNode = requestNode.ele('ojp:Location');

        if (this.stopPlaceRef) {
            const requestPlaceRefNode = locationNode.ele('ojp:PlaceRef');
            requestPlaceRefNode.ele('ojp:StopPlaceRef', this.stopPlaceRef);
            requestPlaceRefNode.ele('ojp:LocationName').ele('ojp:Text', '');
        }

        locationNode.ele('ojp:DepArrTime', dateF);

        const requestParamsNode = requestNode.ele('ojp:Params');
        requestParamsNode.ele('ojp:NumberOfResults', this.numberOfResults);
        requestParamsNode.ele('ojp:StopEventType', this.stopEventType);
        requestParamsNode.ele('ojp:IncludePreviousCalls', this.includePreviousCalls);
        requestParamsNode.ele('ojp:IncludeOnwardCalls', this.includeOnwardCalls);
        requestParamsNode.ele('ojp:IncludeRealtimeData', this.includeRealtimeData);

        const bodyXML_s = contextEl.end();

        return bodyXML_s;
    }
}
