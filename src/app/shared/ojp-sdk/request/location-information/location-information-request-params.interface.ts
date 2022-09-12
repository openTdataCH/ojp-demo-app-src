import { GeoRestrictionType, GeoRestrictionPoiOSMTag } from "../../types/geo-restriction.type";

export interface LocationInformationRequestParams {
  locationName: string
  stopPlaceRef: string
  geoRestrictionType: GeoRestrictionType
  poiOsmTags: GeoRestrictionPoiOSMTag[] | null
  numberOfResults: number
  bboxWest: number
  bboxNorth: number
  bboxEast: number
  bboxSouth: number
}
