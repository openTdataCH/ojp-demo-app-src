import { EventEmitter, Injectable } from "@angular/core";

import * as OJP_Legacy from 'ojp-sdk-v1';
import { LegStopPointData } from "../shared/components/service-stops.component";

@Injectable( {providedIn: 'root'} )
export class TripInfoService {
    public tripInfoResultUpdated = new EventEmitter<OJP_Legacy.TripInfoResult | null>()
    public locationSelected = new EventEmitter<LegStopPointData>()
}
