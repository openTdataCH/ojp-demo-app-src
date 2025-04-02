import { EventEmitter, Injectable, Output } from "@angular/core";

import mapboxgl from "mapbox-gl";

import * as OJP from 'ojp-sdk-v1';

export type StationBoardData = {
    type: OJP.StationBoardType,
    items: OJP.StopEvent[]
}

@Injectable( {providedIn: 'root'} )
export class StationBoardService {
    @Output() stationBoardDataUpdated = new EventEmitter<StationBoardData>()
    @Output() stationBoardEntrySelected = new EventEmitter<OJP.StopEvent | null>()
    @Output() stationOnMapClicked = new EventEmitter<mapboxgl.GeoJSONFeature>()

    public searchDate = new Date();

    constructor() {}
}