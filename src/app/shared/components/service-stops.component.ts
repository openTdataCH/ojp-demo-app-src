import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import * as OJP_Legacy from 'ojp-sdk-v1';

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

  geoPosition: OJP_Legacy.GeoPosition | null

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
  @Output() onExampleTripLocationsUpdated = new EventEmitter<number[]>()

  public selectedEndpointsIDx: number[];

  constructor() {
    this.selectedEndpointsIDx = [];
  }

  ngOnInit(): void {
    this.selectedEndpointsIDx = [0, this.stopPointsData.length - 1];
  }

  ngAfterViewInit(): void {
    this.emitSelectedEndpoints();
  }

  zoomToLocation(stopPoint: LegStopPointData) {
    this.locationSelected.emit(stopPoint);
  }

  private emitSelectedEndpoints() {
    this.onExampleTripLocationsUpdated.emit(this.selectedEndpointsIDx);
  } 

  onRouteEndPointSelected(stopIdx: number) {
    if (this.selectedEndpointsIDx.length != 2) {
      return;
    }

    this.selectedEndpointsIDx.push(stopIdx);

    // Keep last 2 elements
    this.selectedEndpointsIDx = this.selectedEndpointsIDx.slice(-2);

    this.emitSelectedEndpoints();
  }
}
