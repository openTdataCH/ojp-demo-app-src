import { EventEmitter, Injectable, Output } from "@angular/core";

import mapboxgl from "mapbox-gl";

import * as OJP from '../shared/ojp-sdk/index'

@Injectable( {providedIn: 'root'} )
export class StationBoardService {
    @Output() stationBoardEntriesUpdated = new EventEmitter<OJP.StopEvent[]>()
    @Output() stationBoardEntrySelected = new EventEmitter<OJP.StopEvent | null>()
    @Output() stationOnMapClicked = new EventEmitter<mapboxgl.MapboxGeoJSONFeature>()

    constructor() {

    }
}