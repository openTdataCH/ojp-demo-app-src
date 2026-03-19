import { EventEmitter, Injectable } from "@angular/core";

import { LegStopPointData } from "../shared/components/service-stops.component";
import { TripInfoResult } from "../shared/models/trip-info-result";
import { APP_STAGE } from "../config/constants";

@Injectable( {providedIn: 'root'} )
export class TripInfoService {
  public tripInfoResultUpdated = new EventEmitter<TripInfoResult | null>();
  public locationSelected = new EventEmitter<LegStopPointData>();
  public stageChanged = new EventEmitter<APP_STAGE>();
}
