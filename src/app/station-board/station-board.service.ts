import { EventEmitter, Injectable, Output } from "@angular/core";

import mapboxgl from "mapbox-gl";

import * as OJP from '../shared/ojp-sdk/index'

export type StationBoardData = {
    type: OJP.StationBoardType,
    items: OJP.StopEvent[]
}

@Injectable( {providedIn: 'root'} )
export class StationBoardService {
    @Output() stationBoardDataUpdated = new EventEmitter<StationBoardData>()
    @Output() stationBoardEntrySelected = new EventEmitter<OJP.StopEvent | null>()
    @Output() stationOnMapClicked = new EventEmitter<mapboxgl.MapboxGeoJSONFeature>()

    constructor() {}
}