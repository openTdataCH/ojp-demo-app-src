import mapboxgl from "mapbox-gl";

import { XPathOJP } from "../helpers/xpath-ojp";
import { GeoPosition } from "../location/geoposition";

export class LinkProjection {
  public coordinates: GeoPosition[];
  public bbox: mapboxgl.LngLatBounds;

  constructor(coordinates: GeoPosition[], bbox: mapboxgl.LngLatBounds) {
    this.coordinates = coordinates;
    this.bbox = bbox;
  }

  public static initFromTrackSectionNode(trackSectionNode: Node): LinkProjection | null {
    const coordinates: GeoPosition[] = [];
    const bbox = new mapboxgl.LngLatBounds();

    const positionNodes = XPathOJP.queryNodes('ojp:LinkProjection/ojp:Position', trackSectionNode);
    positionNodes.forEach(locationNode => {
      const longitudeS = XPathOJP.queryText('siri:Longitude', locationNode);
      const latitudeS = XPathOJP.queryText('siri:Latitude', locationNode);

      if (longitudeS && latitudeS) {
        const position = new GeoPosition(
          parseFloat(longitudeS),
          parseFloat(latitudeS),
        )
        coordinates.push(position);
        bbox.extend(position.asLngLat());
      }
    });

    if (coordinates.length < 2) {
      return null;
    }

    const linkProjection = new LinkProjection(coordinates, bbox);
    return linkProjection;
  }

  asGeoJSONFeature(): GeoJSON.Feature<GeoJSON.LineString> {
    const feature: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature',
      properties: {
        'draw.type': 'guidance'
      },
      geometry: {
        type: 'LineString',
        coordinates: []
      }
    }

    this.coordinates.forEach(geoPosition => {
      const pointCoords = [geoPosition.longitude, geoPosition.latitude];
      feature.geometry.coordinates.push(pointCoords)
    })

    return feature
  }
}
