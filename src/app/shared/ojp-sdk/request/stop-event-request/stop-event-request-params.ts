import xmlbuilder from 'xmlbuilder';

import { GeoPosition } from "../../location/geoposition"

export class StopEventRequestParams {
    public stopPlaceRef: string | null
    public geoPosition: GeoPosition | null
    public depArrTime: Date
    public numberOfResults: number
    public stopEventType: 'departure' | 'arrival'
    public includePreviousCalls: boolean
    public includeOnwardCalls: boolean
    public includeRealtimeData: boolean

    constructor(stopPlaceRef: string | null, geoPosition: GeoPosition | null) {
        this.stopPlaceRef = stopPlaceRef;
        this.geoPosition = geoPosition;
        this.depArrTime = new Date();
        this.numberOfResults = 10;
        this.stopEventType = 'departure'
        this.includePreviousCalls = false;
        this.includeOnwardCalls = false;
        this.includeRealtimeData = true;
    }

    public buildRequestXML(contextEl: xmlbuilder.XMLElement): string {
        const dateF = this.depArrTime.toISOString();
        
        contextEl.ele('RequestTimestamp', dateF);

        const requestNode = contextEl.ele('ojp:OJPStopEventRequest');
        requestNode.ele('RequestTimestamp', dateF);

        const locationNode = requestNode.ele('ojp:Location');

        if (this.stopPlaceRef) {
            const requestPlaceRefNode = locationNode.ele('ojp:PlaceRef');
            requestPlaceRefNode.ele('ojp:StopPlaceRef', this.stopPlaceRef);
            requestPlaceRefNode.ele('ojp:LocationName').ele('ojp:Text', '');
        }

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
