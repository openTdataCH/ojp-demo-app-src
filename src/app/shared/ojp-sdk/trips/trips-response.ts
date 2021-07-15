import { Location } from '../location/location'
import { Trip } from '../trip/trip'
import { XPathOJP } from '../helpers/xpath-ojp'
import { TripMotType } from '../types/trip-mot-type'

export class TripsResponse {
  public responseXMLText: string
  public contextLocations: Location[]
  public trips: Trip[]

  constructor(responseXMLText: string, contextLocations: Location[], trips: Trip[]) {
    this.responseXMLText = responseXMLText
    this.contextLocations = contextLocations
    this.trips = trips
  }

  public static initWithXML(responseXMLText: string, motType: TripMotType): TripsResponse {
    const responseXML = new DOMParser().parseFromString(responseXMLText, 'application/xml');
    const contextLocations = TripsResponse.parseContextLocations(responseXML);
    const trips = TripsResponse.parseTrips(responseXML, contextLocations, motType);

    const tripResponse = new TripsResponse(responseXMLText, contextLocations, trips)

    return tripResponse
  }

  private static parseContextLocations(responseXML: Document): Location[] {
    let locations: Location[] = [];

    const locationNodes = XPathOJP.queryNodes('//ojp:TripResponseContext/ojp:Places/ojp:Location', responseXML);
    locationNodes.forEach(locationNode => {
      const location = Location.initWithOJPContextNode(locationNode)
      locations.push(location);
    });

    return locations;
  }

  private static parseTrips(responseXML: Document, contextLocations: Location[], motType: TripMotType): Trip[] {
    let trips: Trip[] = [];

    const mapContextLocations: Record<string, Location> = {}
    contextLocations.forEach(location => {
      const stopPlaceRef = location.stopPlace?.stopPlaceRef
      if (stopPlaceRef) {
        mapContextLocations[stopPlaceRef] = location
      }
    });

    const tripResultNodes = XPathOJP.queryNodes('//ojp:TripResult', responseXML);
    tripResultNodes.forEach(tripResult => {
      const trip = Trip.initFromTripResultNode(tripResult as Node, motType);
      if (trip) {
        trip.legs.forEach(leg => {
          leg.patchLocations(mapContextLocations)
        })
        trips.push(trip);
      }
    });

    return trips
  }
}
