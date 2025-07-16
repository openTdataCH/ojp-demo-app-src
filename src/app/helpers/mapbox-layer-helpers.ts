import * as mapboxgl from "mapbox-gl";

import OJP_Legacy from '../config/ojp-legacy';

import { MapLegTypeColor, MapLegTypes, MapLegLineTypeColor } from '../config/map-colors';

import { TripLegDrawType, TripLegLineType, TripLegPropertiesEnum } from '../shared/types/map-geometry-types';

export class MapboxLayerHelpers {
  public static FilterBeelines(): mapboxgl.ExpressionSpecification {
    const drawType: TripLegDrawType = 'Beeline';
    return this.FilterByDrawType(drawType);
  }

  public static FilterWalkingLegs(): mapboxgl.ExpressionSpecification {
    const filterExpression: mapboxgl.ExpressionSpecification = [
      "all",
      this.FilterByDrawType('LegLine'),
      this.FilterByLineTypes(['Guidance', 'Walk']),
    ];

    return filterExpression
  }

  public static FilterLegPoints(): mapboxgl.ExpressionSpecification {
    return this.FilterByDrawType('LegPoint')
  }

  public static ColorCaseByLegLineType(): mapboxgl.ExpressionSpecification {
    const caseExpression: mapboxgl.ExpressionSpecification = ["case"];

    const MapTripLegLineTypes = Object.keys(MapLegLineTypeColor) as TripLegLineType[];
    MapTripLegLineTypes.forEach(lineType => {
      const caseOptionCondition = ["==", ["get", TripLegPropertiesEnum.LineType], lineType]
      caseExpression.push(caseOptionCondition)

      const colorCode = MapLegLineTypeColor[lineType]
      caseExpression.push(colorCode)
    });

    // Default is Pink
    caseExpression.push('#FF1493')

    return caseExpression
  }

  private static FilterByDrawType(drawType: TripLegDrawType): mapboxgl.ExpressionSpecification {
    const filterExpression: mapboxgl.ExpressionSpecification = [
      "==", ["get", TripLegPropertiesEnum.DrawType], drawType
    ]
    return filterExpression
  }

  public static FilterByPointType(pointType: OJP_Legacy.StopPointType): mapboxgl.ExpressionSpecification {
    const filterExpression: mapboxgl.ExpressionSpecification = [
      "==", ["get", TripLegPropertiesEnum.PointType], pointType
    ]
    return filterExpression
  }

  private static FilterByLineType(lineType: TripLegLineType): mapboxgl.ExpressionSpecification {
    const filterExpression: mapboxgl.ExpressionSpecification = [
      "==", ["get", TripLegPropertiesEnum.LineType], lineType
    ]
    return filterExpression
  }

  public static FilterTimedLegTracks(): mapboxgl.ExpressionSpecification {
    const filterExpression: mapboxgl.ExpressionSpecification = [
      "all",
      // TODO - exclude Walk
      this.FilterByDrawType('LegLine'),
    ]

    return filterExpression
  }

  private static FilterByLineTypes(lineTypes: TripLegLineType[]): mapboxgl.ExpressionSpecification {
    const lineTypesExpression: mapboxgl.ExpressionSpecification = [
      "in",
      ["get", TripLegPropertiesEnum.LineType],
      ["literal", lineTypes],
    ];

    return lineTypesExpression;
  }

  public static ColorCaseByLegType(): mapboxgl.ExpressionSpecification {
    const caseExpression: mapboxgl.ExpressionSpecification = ["case"]

    MapLegTypes.forEach(legType => {
      const caseOptionCondition = ["==", ["get", TripLegPropertiesEnum.LegType], legType];
      caseExpression.push(caseOptionCondition);

      const colorCode = MapLegTypeColor[legType];
      caseExpression.push(colorCode);
    });

    // Default is Pink
    caseExpression.push('#FF1493');

    return caseExpression;
  }
}
