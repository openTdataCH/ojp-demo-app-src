import { EventEmitter, Injectable } from "@angular/core";

import OJP_Legacy from '../config/ojp-legacy';
import { LegStopPointData } from "../shared/components/service-stops.component";

@Injectable( {providedIn: 'root'} )
export class TripInfoService {
    public tripInfoResultUpdated = new EventEmitter<OJP_Legacy.TripInfoResult | null>()
    public locationSelected = new EventEmitter<LegStopPointData>()
}
