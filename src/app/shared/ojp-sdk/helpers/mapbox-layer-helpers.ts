import mapboxgl from "mapbox-gl";

import { MapLegTypeColor, MapLegTypes, MapLegLineTypeColor, MapTripLegLineTypes } from "../config/map-colors";
import { LegType } from "../trip";

import { TripLegDrawType, TripLegLineType, TripLegPropertiesEnum } from "../types/map-geometry-types";
import { StopPointType } from "../types/stop-point-type";

export class MapboxLayerHelpers {
  public static FilterBeelines(): mapboxgl.Expression {
    const drawType: TripLegDrawType = 'Beeline'
    return this.FilterByDrawType(drawType)
  }

  public static FilterWalkingLegs(): mapboxgl.Expression {
    const filterExpression: mapboxgl.Expression = [
      "all",
      this.FilterByDrawType('LegLine'),
      this.FilterByLineType('Walk'),
    ]

    return filterExpression
  }

  public static FilterLegPoints(): mapboxgl.Expression {
    return this.FilterByDrawType('LegPoint')
  }

  public static ColorCaseByLegLineType(): mapboxgl.Expression {
    const caseExpression: mapboxgl.Expression = ["case"]

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

  private static FilterByLegType(legType: LegType): mapboxgl.Expression {
    const filterExpression: mapboxgl.Expression = [
      "==", ["get", TripLegPropertiesEnum.LegType], legType
    ]
    return filterExpression
  }

  private static FilterByDrawType(drawType: TripLegDrawType): mapboxgl.Expression {
    const filterExpression: mapboxgl.Expression = [
      "==", ["get", TripLegPropertiesEnum.DrawType], drawType
    ]
    return filterExpression
  }

  public static FilterByPointType(pointType: StopPointType): mapboxgl.Expression {
    const filterExpression: mapboxgl.Expression = [
      "==", ["get", TripLegPropertiesEnum.PointType], pointType
    ]
    return filterExpression
  }

  private static FilterByLineType(lineType: TripLegLineType): mapboxgl.Expression {
    const filterExpression: mapboxgl.Expression = [
      "==", ["get", TripLegPropertiesEnum.LineType], lineType
    ]
    return filterExpression
  }

  public static FilterTimedLegTracks(): mapboxgl.Expression {
    const filterExpression: mapboxgl.Expression = [
      "all",
      this.FilterByDrawType('LegLine'),
    ]

    return filterExpression
  }

  public static ColorCaseByLegType(): mapboxgl.Expression {
    const caseExpression: mapboxgl.Expression = ["case"]

    MapLegTypes.forEach(legType => {
      const caseOptionCondition = ["==", ["get", TripLegPropertiesEnum.LegType], legType]
      caseExpression.push(caseOptionCondition)

      const colorCode = MapLegTypeColor[legType]
      caseExpression.push(colorCode)
    });

    // Default is Pink
    caseExpression.push('#FF1493')

    return caseExpression
  }


}
