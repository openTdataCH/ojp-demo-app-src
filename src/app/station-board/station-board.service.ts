import { EventEmitter, Injectable, Output } from "@angular/core";

import mapboxgl from "mapbox-gl";

import { StationBoardType } from "./types/stop-event";
import { StopEventResult } from "../shared/models/stop-event-result";

export type StationBoardData = {
    type: StationBoardType,
    items: StopEventResult[],
};

@Injectable( {providedIn: 'root'} )
export class StationBoardService {
    @Output() stationBoardDataUpdated = new EventEmitter<StationBoardData>();
    @Output() stationBoardEntrySelected = new EventEmitter<StopEventResult | null>();
    @Output() stationOnMapClicked = new EventEmitter<mapboxgl.GeoJSONFeature>();

    public searchDate = new Date();

    constructor() {
        
    }
}
