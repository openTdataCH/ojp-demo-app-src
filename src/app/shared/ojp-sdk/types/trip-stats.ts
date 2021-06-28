import { Duration } from './duration'

export interface TripStats {
    duration: Duration
    distanceMeters: number
    transferNo: number
    startDatetime: Date
    endDatetime: Date
}
