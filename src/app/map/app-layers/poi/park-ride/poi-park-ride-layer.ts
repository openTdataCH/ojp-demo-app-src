import mapboxgl from "mapbox-gl";
import { UserTripService } from "src/app/shared/services/user-trip.service";
import * as OJP from '../../../../shared/ojp-sdk/index'

import { LocationMapAppLayer } from '../../location-map-app-layer'
import { MapAppLayer } from "../../map-app-layer.interface";
import { MapPoiPropertiesEnum, MapPoiTypeEnum } from "../../map-poi-type-enum";

import parkRideStationIconLayer from './map-layers-def/park-ride-station-icon.json'
import parkRideStationLabelLayer from './map-layers-def/park-ride-station-label.json'

export class PoiParkRideLayer extends LocationMapAppLayer implements MapAppLayer {
  public static layerKey = 'park-ride'
  public static geoRestrictionType: OJP.GeoRestrictionType = 'poi'
  public static minZoomLevel = 12.0
  public static sourceId = 'ojp-park-ride'

  private parkRideStationIconLayerID = 'ojp-park-ride-icon'
  private parkRideStationLabelLayerID = 'ojp-park-ride-label'

  constructor(map: mapboxgl.Map, userTripService: UserTripService) {
    super(
      map,
      PoiParkRideLayer.geoRestrictionType,
      PoiParkRideLayer.layerKey,
      PoiParkRideLayer.minZoomLevel,
      PoiParkRideLayer.sourceId,
      userTripService
    )

    this.geoRestrictionPoiOSMTag = 'park_ride'
  }

  public addToMap() {
    parkRideStationIconLayer.id = this.parkRideStationIconLayerID
    parkRideStationIconLayer.minzoom = this.minZoomLevel

    parkRideStationLabelLayer.id = this.parkRideStationLabelLayerID
    parkRideStationLabelLayer.minzoom = this.minZoomLevel

    const mapLayers = [parkRideStationIconLayer, parkRideStationLabelLayer]

    this.createSourceAddMapLayers(mapLayers as mapboxgl.Layer[])
  }

  public onMapClick(ev: mapboxgl.MapMouseEvent): boolean {
    const layerIDs = [this.parkRideStationIconLayerID, this.parkRideStationLabelLayerID];

    return this.onMapClickByLayerIDs(ev.lngLat, layerIDs)
  }

  public queryNearbyFeature(lngLat: mapboxgl.LngLat): mapboxgl.MapboxGeoJSONFeature | null {
    const layerIDs = [this.parkRideStationIconLayerID, this.parkRideStationLabelLayerID];
    const feature = this.queryNearbyFeatureByLayerIDs(lngLat, layerIDs);
    return feature
  }

  protected computeFeatureFromLocation(location: OJP.Location): GeoJSON.Feature | null {
    const feature = location.asGeoJSONFeature();

    const featureProperties = feature?.properties
    if (featureProperties) {
      featureProperties[MapPoiPropertiesEnum.PoiType] = MapPoiTypeEnum.ParkAndRail
    }

    return feature
  }
}
