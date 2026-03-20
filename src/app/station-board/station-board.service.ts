import { EventEmitter, Injectable } from "@angular/core";

import mapboxgl from "mapbox-gl";

import { StationBoardType } from "./types/stop-event";
import { StopEventResult } from "../shared/models/stop-event-result";
import { APP_STAGE } from "../config/constants";

export type StationBoardData = {
    type: StationBoardType,
    items: StopEventResult[],
};

@Injectable( {providedIn: 'root'} )
export class StationBoardService {
    public stationBoardDataUpdated = new EventEmitter<StationBoardData>();
    public stationBoardEntrySelected = new EventEmitter<StopEventResult | null>();
    public stationOnMapClicked = new EventEmitter<mapboxgl.GeoJSONFeature>();
    public stageChanged = new EventEmitter<APP_STAGE>();

    public searchDate = new Date();

    constructor() {}
}
