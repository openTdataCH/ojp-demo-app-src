import { StopPlace } from "../shared/models/place/stop-place";

export class DataHelpers {
  public static convertStopPointToStopPlace(stopPointRef: string): string {
    if (typeof(stopPointRef) === 'number') {
      stopPointRef = '' + stopPointRef;
    }

    if (!stopPointRef.includes(':sloid:')) {
      return stopPointRef;
    }

    // ch:1:sloid:92321:2:31
    // ch:1:sloid:7000
    const sloidParts = stopPointRef.split(':sloid:');
    if (sloidParts.length !== 2) {
      return stopPointRef;
    }

    const countryMatches = sloidParts[0].match(/^([^:]+?):([^:]+?)$/);
    if (countryMatches === null) {
      return stopPointRef;
    }

    const stopParts = sloidParts[1].split(':');
    
    const countryRef = countryMatches[1];
    if (countryRef === 'ch') {
      const stopPlaceRef = '85' + stopParts[0].padStart(5, '0').slice(-5);
      return stopPlaceRef;
    }

    console.log('convertStopPointToStopPlace: unhandled countryRef for ' + stopPointRef);
    console.log(stopPointRef);
    console.log(countryMatches);

    return stopPointRef;
  }

  public static generateZVV_Id(stopPlace: StopPlace): string {
    const stopPlaceRef = DataHelpers.convertStopPointToStopPlace(stopPlace.placeRef.ref);

    // A=1@O=Gurten Kulm@X=7439751@Y=46919610@U=90@L=8507099@p=1773077090@
    const idParts: string[] = [
      'A=1',
      'O=' + stopPlace.computeName(),
      'X=' + stopPlace.geoPosition.longitude.toString().replace('.', ''),
      'Y=' + stopPlace.geoPosition.latitude.toString().replace('.', ''),
      'L=' + stopPlaceRef,
      'p=1773077090',
      ''
    ];

    const zvvId = idParts.join('@');

    return zvvId;
  }
}
