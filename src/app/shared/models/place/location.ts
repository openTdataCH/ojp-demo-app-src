import { BasePlace } from '../place';

const literalCoordsRegexp = /^([0-9\.]+?),([0-9\.]+?)$/;

export class PlaceLocation extends BasePlace {
  public constructor(longitude: number, latitude: number, placeName: string | null = null) {
    super(longitude, latitude, 'location', placeName ?? 'n/a');
    if (placeName === null) {
      this.placeName = this.geoPosition.asLatLngString();
    }
  }

  public static Empty(placeName: string = 'n/a') {
    const stopPlace = new PlaceLocation(0, 0, placeName);
    return stopPlace;
  }

  public static initFromLiteralCoords(inputS: string): PlaceLocation | null {
    let inputLiteralCoords = inputS.trim();
    // strip: parantheses (groups)
    inputLiteralCoords = inputLiteralCoords.replace(/\(.+?\)/g, '');
    // strip: characters NOT IN [0..9 , .]
    inputLiteralCoords = inputLiteralCoords.replace(/[^0-9\.,]/g, '');

    const inputMatches = inputLiteralCoords.match(literalCoordsRegexp);
    if (inputMatches === null) {
      return null;
    }

    let longitude = parseFloat(inputMatches[1]);
    let latitude = parseFloat(inputMatches[2]);
    // In CH always long < lat
    if (longitude > latitude) {
      longitude = parseFloat(inputMatches[2]);
      latitude = parseFloat(inputMatches[1]);
    }
    
    const place = new PlaceLocation(longitude, latitude);

    // Match the content inside the ()
    const nameMatches = inputS.trim().match(/\(([^\)]*)\)?/);
    if (nameMatches !== null) {
      place.placeName = nameMatches[1];
    }
    
    return place;
  }
}
