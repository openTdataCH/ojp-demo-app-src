import { EventEmitter, Injectable, Output } from "@angular/core";

import mapboxgl from "mapbox-gl";

import OJP_Legacy from '../config/ojp-legacy';

export type StationBoardData = {
    type: OJP_Legacy.StationBoardType,
    items: OJP_Legacy.StopEvent[]
}

@Injectable( {providedIn: 'root'} )
export class StationBoardService {
    @Output() stationBoardDataUpdated = new EventEmitter<StationBoardData>()
    @Output() stationBoardEntrySelected = new EventEmitter<OJP_Legacy.StopEvent | null>()
    @Output() stationOnMapClicked = new EventEmitter<mapboxgl.GeoJSONFeature>()

    public searchDate = new Date();

    constructor() {}
}