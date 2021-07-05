import { Component, Input, OnInit } from '@angular/core';
import { MapPoiPropertiesEnum, MapPoiTypeEnum } from 'src/app/map/app-layers/map-poi-type-enum';
import { UserTripService } from 'src/app/shared/services/user-trip.service';
import * as OJP from '../../shared/ojp-sdk/index'

@Component({
  selector: 'trip-via-point',
  templateUrl: './trip-via-point.component.html',
  styleUrls: ['./trip-via-point.component.scss']
})
export class TripViaPointComponent implements OnInit {
  @Input() location: OJP.Location | undefined
  @Input() viaIDx: number

  public motTypes: OJP.TripMotType[]
  public prevMotType: OJP.TripMotType
  public nextMotType: OJP.TripMotType
  private viaPoiType: MapPoiTypeEnum | null

  constructor(private userTripService: UserTripService) {
    this.viaIDx = 0

    this.motTypes = OJP.TripMotTypes
    this.prevMotType = 'Default'
    this.nextMotType = 'Default'
    this.viaPoiType = null
  }

  ngOnInit() {
    this.prevMotType = this.userTripService.tripMotTypes[this.viaIDx]
    this.nextMotType = this.userTripService.tripMotTypes[this.viaIDx + 1]

    const featureProperties = this.location?.geoPosition?.properties ?? null
    if (featureProperties) {
      this.viaPoiType = featureProperties[MapPoiPropertiesEnum.PoiType] ?? null
    }
  }

  public computeViaName(): string {
    const defaultName = this.location?.geoPosition?.asLatLngString() ?? ''
    const featureProperties = this.location?.geoPosition?.properties ?? null

    if (featureProperties === null) {
      return defaultName
    }

    if (this.viaPoiType === 'BikeSharing') {
      const stationName = 'Donkey Rep. ' + featureProperties['name'] ?? ''
      return stationName
    }

    if (this.viaPoiType === 'ParkAndRail') {
      const stationName = 'P+Rail ' + (featureProperties['label'] ?? '')
      return stationName
    }

    if (this.viaPoiType === 'PublicTransportStop') {
      const stationName = 'Stop ' + (featureProperties['stopPlace.stopPlaceName'] ?? '')
      return stationName
    }

    return defaultName
  }

  public handleClickOnRemove() {
    if (this.location) {
      this.userTripService.removeViaAtIndex(this.viaIDx)
    }
  }

  public computeIsLast(): boolean {
    return this.viaIDx === this.userTripService.viaLocations.length - 1
  }

  public isBikeSharing(): boolean {
    return this.viaPoiType === 'BikeSharing'
  }

  public onOptionChange(event: Event, seqMotType: string) {
    const inputEl = event.target as HTMLInputElement
    const motType = inputEl.value as OJP.TripMotType

    const isPreviousMotType = seqMotType === 'prev'
    if (isPreviousMotType) {
      this.prevMotType = motType
      this.userTripService.updateTripMotType(motType, this.viaIDx)
    } else {
      this.nextMotType = motType
      this.userTripService.updateTripMotType(motType, this.viaIDx + 1)
    }
  }
}
