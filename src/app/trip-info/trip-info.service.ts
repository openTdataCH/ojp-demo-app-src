import { EventEmitter, Injectable } from "@angular/core";

import * as OJP from 'ojp-sdk-v2'
import { LegStopPointData } from "../shared/components/service-stops.component";

@Injectable( {providedIn: 'root'} )
export class TripInfoService {
    public tripInfoResultUpdated = new EventEmitter<OJP.TripInfoResult | null>()
    public locationSelected = new EventEmitter<LegStopPointData>()
}
