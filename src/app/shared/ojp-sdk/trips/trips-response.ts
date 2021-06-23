import { Location } from '../location/location'
import { Trip } from '../trip/trip'
import { TripTimedLeg } from '../trip/leg/trip-timed-leg'
import { XPathOJP } from '../helpers/xpath-ojp'
import { XML_Helpers } from '../helpers/xml-helpers'

export class TripsResponse {
  public responseXMLText: string
  public contextLocations: Location[]
  public trips: Trip[]

  constructor(responseXMLText: string, contextLocations: Location[], trips: Trip[]) {
    this.responseXMLText = XML_Helpers.prettyPrintXML(responseXMLText)
    this.contextLocations = contextLocations
    this.trips = trips
  }

  public static initWithXML(responseXMLText: string): TripsResponse {
    const responseXML = new DOMParser().parseFromString(responseXMLText, 'application/xml');
    const contextLocations = TripsResponse.parseContextLocations(responseXML);
    const trips = TripsResponse.parseTrips(responseXML, contextLocations);

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

  private static parseTrips(responseXML: Document, contextLocations: Location[]): Trip[] {
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
      const trip = Trip.initFromTripResultNode(tripResult as Node, contextLocations);
      if (trip) {
        // Massage locations
        trip.legs.forEach(leg => {
          [leg.fromLocation, leg.toLocation].forEach(location => {
            TripsResponse.patchLocation(location, mapContextLocations);
          })

          if (leg.legType === 'TimedLeg') {
            const timedLeg = leg as TripTimedLeg
            timedLeg.intermediateStopPoints.forEach(stopPoint => {
              TripsResponse.patchLocation(stopPoint.location, mapContextLocations);
            });
          }
        });

        trips.push(trip);
      }
    });

    return trips
  }

  private static patchLocation(location: Location, mapContextLocations: Record<string, Location>) {
    if (location.geoPosition) {
      return
    }

    const stopPointRef = location.stopPointRef
    if (stopPointRef && (stopPointRef in mapContextLocations)) {
      const contextLocation = mapContextLocations[stopPointRef]

      location.locationName = contextLocation.locationName
      location.stopPlace = contextLocation.stopPlace
      location.geoPosition = contextLocation.geoPosition
    }
  }
}
