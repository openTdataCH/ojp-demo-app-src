import { Component, Input, OnInit } from '@angular/core';
import { SbbDialog } from '@sbb-esta/angular-business/dialog';

import * as OJP from '../../shared/ojp-sdk/index'

import { DebugXmlPopoverComponent } from '../debug-xml-popover/debug-xml-popover.component';

import { MapService } from 'src/app/shared/services/map.service';
import { UserTripService } from 'src/app/shared/services/user-trip.service';

interface TripMotTypeDataModel {
  sectionRequestData: OJP.RequestData | null,
  isNotLastSegment: boolean
}

@Component({
  selector: 'trip-mot-type',
  templateUrl: './trip-mot-type.component.html',
  styleUrls: ['./trip-mot-type.component.scss']
})
export class TripMotTypeComponent implements OnInit {
  @Input() tripMotTypeIdx: number

  // Needed by the template
  public motTypes: OJP.TripMotType[]
  public tripMotType: OJP.TripMotType

  public tripMotTypeDataModel: TripMotTypeDataModel

  constructor(private debugXmlPopover: SbbDialog, public userTripService: UserTripService, private mapService: MapService) {
    this.motTypes = OJP.TripMotTypes

    this.tripMotTypeIdx = 0
    this.tripMotType = this.userTripService.tripMotTypes[0]

    this.tripMotTypeDataModel = <TripMotTypeDataModel>{}
  }

  ngOnInit() {
    this.tripMotType = this.userTripService.tripMotTypes[this.tripMotTypeIdx]

    this.tripMotTypeDataModel.isNotLastSegment = !this.isLastSegment();
    this.tripMotTypeDataModel.sectionRequestData = null

    this.userTripService.activeTripSelected.subscribe(trip => {
      this.updateRequestDataModel()
    })
  }

  private isLastSegment(): boolean {
    return this.tripMotTypeIdx === (this.userTripService.tripMotTypes.length - 1);
  }

  public handleTapOnMapButton() {
    const location = this.userTripService.viaLocations[this.tripMotTypeIdx] ?? null
    this.mapService.tryToCenterAndZoomToLocation(location)
  }

  public computeViaName(): string {
    const nextViaLocation = this.userTripService.viaLocations[this.tripMotTypeIdx] ??  null
    if (nextViaLocation === null) {
      return ''
    }

    const defaultName = nextViaLocation.geoPosition?.asLatLngString() ?? ''

    return defaultName
  }

  public removeVia() {
    this.userTripService.removeViaAtIndex(this.tripMotTypeIdx)
  }

  public onOptionChange(event: Event) {
    const inputEl = event.target as HTMLInputElement
    const motType = inputEl.value as OJP.TripMotType

    this.tripMotType = motType
    this.userTripService.updateTripMotType(motType, this.tripMotTypeIdx)
  }

  private updateRequestDataModel() {
    this.tripMotTypeDataModel.isNotLastSegment = !this.isLastSegment();

    const lastJourneyResponse = this.userTripService.lastJourneyResponse
    if (lastJourneyResponse === null) {
      this.tripMotTypeDataModel.sectionRequestData = null
      return
    }

    const journeySection = lastJourneyResponse.sections[this.tripMotTypeIdx] ?? null
    if (journeySection === null) {
      this.tripMotTypeDataModel.sectionRequestData = null
      return
    }

    this.tripMotTypeDataModel.sectionRequestData = journeySection.requestData
  }

  public showRequestXmlPopover() {
    const dialogRef = this.debugXmlPopover.open(DebugXmlPopoverComponent, {
      height: '40rem',
      position: { top: '10px' },
    });
    dialogRef.afterOpen().subscribe(() => {
      const popover = dialogRef.componentInstance as DebugXmlPopoverComponent
      popover.updateRequestData(this.tripMotTypeDataModel.sectionRequestData)
    });
  }
}
