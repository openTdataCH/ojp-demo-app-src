export class DataHelpers {
  public static convertStopPointToStopPlace(stopPointRef: string): string {
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
}
