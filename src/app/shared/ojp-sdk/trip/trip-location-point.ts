import { Location } from "../location/location"
import { IndividualTransportMode } from "../types/individual-mode.types"

export class TripLocationPoint {
    public location: Location
    public minDuration: number
    public maxDuration: number
    public minDistance: number
    public maxDistance: number

    public customTransportMode?: IndividualTransportMode | null

    constructor(location: Location) {
        this.location = location
        this.minDuration = 2
        this.maxDuration = 30
        this.minDistance = 100
        this.maxDistance = 20000
        this.customTransportMode = null
    }
}