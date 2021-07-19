import { Duration } from "../shared/duration";

export interface TripStats {
    duration: Duration
    distanceMeters: number
    transferNo: number
    startDatetime: Date
    endDatetime: Date
}
