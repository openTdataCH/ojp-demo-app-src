import mapboxgl from "mapbox-gl";
import { UserTripService } from "src/app/shared/services/user-trip.service";
import * as OJP from '../../../../shared/ojp-sdk/index'

import { LocationMapAppLayer } from '../../location-map-app-layer'
import { MapAppLayer } from "../../map-app-layer.interface";
import { MapPoiPropertiesEnum, MapPoiTypeEnum } from "../../map-poi-type-enum";

import bikeSharingStationsIconLayer from './map-layers-def/bike-sharing-stations-icon.json'

export class PoiBicycleRentalLayer extends LocationMapAppLayer implements MapAppLayer {
  public static layerKey = 'bicycle-rental'
  public static geoRestrictionType: OJP.GeoRestrictionType = 'poi'
  public static minZoomLevel = 12.0
  public static sourceId = 'ojp-bicycle-rental'

  private bicycleLayerID = 'ojp-bicycle-rental'

  constructor(map: mapboxgl.Map, userTripService: UserTripService) {
    super(
      map,
      PoiBicycleRentalLayer.geoRestrictionType,
      PoiBicycleRentalLayer.layerKey,
      PoiBicycleRentalLayer.minZoomLevel,
      PoiBicycleRentalLayer.sourceId,
      userTripService
    )

    this.geoRestrictionPoiOSMTag = 'bicycle_rental'
  }

  public addToMap() {
    const mapLayers = [bikeSharingStationsIconLayer]
    bikeSharingStationsIconLayer.id = this.bicycleLayerID
    bikeSharingStationsIconLayer.minzoom = this.minZoomLevel

    this.createSourceAddMapLayers(mapLayers as mapboxgl.Layer[])
  }

  public onMapClick(ev: mapboxgl.MapMouseEvent): boolean {
    const layerIDs = [this.bicycleLayerID];

    return this.onMapClickByLayerIDs(ev.lngLat, layerIDs)
  }

  public queryNearbyFeature(lngLat: mapboxgl.LngLat): mapboxgl.MapboxGeoJSONFeature | null {
    const layerIDs = [this.bicycleLayerID];
    const feature = this.queryNearbyFeatureByLayerIDs(lngLat, layerIDs);
    return feature
  }

  protected computeFeatureFromLocation(location: OJP.Location): GeoJSON.Feature | null {
    const feature = location.asGeoJSONFeature();

    const featureProperties = feature?.properties
    if (featureProperties) {
      featureProperties[MapPoiPropertiesEnum.PoiType] = MapPoiTypeEnum.BikeSharing
    }

    return feature
  }
}
