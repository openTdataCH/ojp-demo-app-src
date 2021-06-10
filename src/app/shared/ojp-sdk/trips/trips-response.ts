import { Location } from '../location/location'
import { Trip } from '../trip/trip'
import { XPathOJP } from '../helpers/xpath-ojp'

export class TripsResponse {
    public contextLocations: Location[]
    public trips: Trip[]

    constructor(responseXMLText: string) {
        const responseXML = new DOMParser().parseFromString(responseXMLText, 'application/xml');

        this.contextLocations = this.parseContextLocations(responseXML);
        this.trips = this.parseTrips(responseXML);
    }

    private parseContextLocations(responseXML: Document): Location[] {
        let locations: Location[] = [];

        const locationNodes = XPathOJP.queryNodes('//ojp:TripResponseContext/ojp:Places/ojp:Location', responseXML);
        locationNodes.forEach(locationNode => {
            const location = Location.initWithOJPContextNode(locationNode)
            locations.push(location);
        });

        return locations;
    }

    private parseTrips(responseXML: Document): Trip[] {
        let trips: Trip[] = [];

        const mapContextLocations: Record<string, Location> = {}
        this.contextLocations.forEach(location => {
          const stopPlaceRef = location.stopPlace?.stopPlaceRef
          if (stopPlaceRef) {
            mapContextLocations[stopPlaceRef] = location
          }
        });

        const tripResultNodes = XPathOJP.queryNodes('//ojp:TripResult', responseXML);
        tripResultNodes.forEach(tripResult => {
            const trip = Trip.initFromTripResultNode(tripResult as Node, this.contextLocations);
            if (trip) {
              // Massage locations
              trip.legs.forEach(leg => {
                [leg.fromLocation, leg.toLocation].forEach(location => {
                  if (location.geoPosition === null) {
                    const stopPointRef = location.stopPointRef
                    if (stopPointRef && (stopPointRef in mapContextLocations)) {
                      const contextLocation = mapContextLocations[stopPointRef]

                      location.locationName = contextLocation.locationName
                      location.stopPlace = contextLocation.stopPlace
                      location.geoPosition = contextLocation.geoPosition
                    }
                  }
                })
              });

              trips.push(trip);
            }
        });

        return trips
    }
}