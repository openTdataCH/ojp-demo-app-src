import { GeoRestrictionType } from "../../types/geo-restriction.type";

export interface LocationInformationRequestParams {
  locationName: string
  stopPlaceRef: string
  geoRestrictionType: GeoRestrictionType
  numberOfResults: number
  bboxWest: number
  bboxNorth: number
  bboxEast: number
  bboxSouth: number
}
