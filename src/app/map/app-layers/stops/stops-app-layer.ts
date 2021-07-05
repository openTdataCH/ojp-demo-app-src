import mapboxgl from "mapbox-gl";
import { UserTripService } from "src/app/shared/services/user-trip.service";
import * as OJP from '../../../shared/ojp-sdk/index'

import { LocationMapAppLayer } from '../location-map-app-layer'
import { MapAppLayer } from "../map-app-layer.interface";

import stopsCircleLayer from './map-layers-def/stops-circle.json';
import stopsLabelLayer from './map-layers-def/stops-label.json'

export class StopsAppLayer extends LocationMapAppLayer implements MapAppLayer {
  public static layerKey = 'stops'
  public static geoRestrictionType: OJP.GeoRestrictionType = 'stop'
  public static minZoomLevel = 13.0
  public static sourceId = 'ojp-stops'

  private stopsCircleLayerID = 'stops-circle'
  private stopsLabelLayerID = 'stops-label'

  constructor(map: mapboxgl.Map, userTripService: UserTripService) {
    super(
      map,
      StopsAppLayer.geoRestrictionType,
      StopsAppLayer.layerKey,
      StopsAppLayer.minZoomLevel,
      StopsAppLayer.sourceId,
      userTripService
    )
  }

  public addToMap() {
    const mapLayers = [stopsCircleLayer, stopsLabelLayer]
    stopsCircleLayer.id = this.stopsCircleLayerID;
    stopsCircleLayer.minzoom = this.minZoomLevel

    stopsLabelLayer.id = this.stopsLabelLayerID;

    this.createSourceAddMapLayers(mapLayers as mapboxgl.Layer[])
  }

  public queryNearbyFeature(lngLat: mapboxgl.LngLat): mapboxgl.MapboxGeoJSONFeature | null {
    const layerIDs = [this.stopsCircleLayerID];
    const feature = this.queryNearbyFeatureByLayerIDs(lngLat, layerIDs);
    return feature
  }

  public onMapClick(ev: mapboxgl.MapMouseEvent): boolean {
    const layerIDs = [this.stopsCircleLayerID, this.stopsLabelLayerID];

    return this.onMapClickByLayerIDs(ev.lngLat, layerIDs)
  }

  protected computePopupHTML(location: OJP.Location): string {
    let popupHTML = (document.getElementById('map-endpoint-stop-picker-popup') as HTMLElement).innerHTML;

    const stopPlaceName = location.stopPlace?.stopPlaceName ?? '';
    popupHTML = popupHTML.replace('[STOP_NAME]', stopPlaceName);

    const stopPlaceRef = location.stopPlace?.stopPlaceRef ?? '';
    popupHTML = popupHTML.replace('[STOP_ID]', stopPlaceRef);

    return popupHTML
  }

}
