import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import * as OJP from 'ojp-sdk'

export interface LegStopPointData {
  locationText: string,
  
  arrText: string | null,
  arrDelayText: string | null,
  depText: string | null,
  depDelayText: string | null,

  platformText: string | null,
  actualPlatformText: string | null,
  
  platformAssistanceIconPath: string | null,
  platformAssistanceTooltip: string,

  geoPosition: OJP.GeoPosition | null

  isNotServicedStop: boolean
}

@Component({
  selector: 'service-stops',
  styleUrls: ['./service-stops.component.scss'],
  templateUrl: './service-stops.component.html',
})
export class ServiceStopsComponent implements OnInit, AfterViewInit {
  @Input() stopPointsData: LegStopPointData[] = []
  @Output() locationSelected = new EventEmitter<LegStopPointData>()

  constructor() {}

  ngOnInit(): void {

  }

  ngAfterViewInit(): void {

  }

  zoomToLocation(stopPoint: LegStopPointData) {
    this.locationSelected.emit(stopPoint);
  }
}
