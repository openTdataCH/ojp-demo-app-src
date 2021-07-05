import mapboxgl from "mapbox-gl";

import { UserTripService } from "src/app/shared/services/user-trip.service";
import * as OJP from '../../../shared/ojp-sdk/index'

import { LocationMapAppLayer } from '../location-map-app-layer'
import { MapAppLayer } from "../map-app-layer.interface";

import addressCircleLayer from './map-layers-def/address-circle.json';

export class AddressAppLayer extends LocationMapAppLayer implements MapAppLayer {
  public static layerKey = 'address'
  public static geoRestrictionType: OJP.GeoRestrictionType = 'address'
  public static minZoomLevel = 17.0
  public static sourceId = 'ojp-address'

  private addressCircleLayerID = 'address-circle'

  constructor(map: mapboxgl.Map, userTripService: UserTripService) {
    super(
      map, AddressAppLayer.geoRestrictionType,
      AddressAppLayer.layerKey,
      AddressAppLayer.minZoomLevel,
      AddressAppLayer.sourceId,
      userTripService
    )
  }

  public addToMap() {
    addressCircleLayer.id = this.addressCircleLayerID;
    addressCircleLayer.minzoom = this.minZoomLevel

    const mapLayers = [addressCircleLayer]
    this.createSourceAddMapLayers(mapLayers as mapboxgl.Layer[])
  }

  public queryNearbyFeature(lngLat: mapboxgl.LngLat): mapboxgl.MapboxGeoJSONFeature | null {
    const layerIDs = [this.addressCircleLayerID];
    const feature = this.queryNearbyFeatureByLayerIDs(lngLat, layerIDs);
    return feature
  }

  public onMapClick(ev: mapboxgl.MapMouseEvent): boolean {
    const layerIDs = [this.addressCircleLayerID];

    return this.onMapClickByLayerIDs(ev.lngLat, layerIDs)
  }

}
