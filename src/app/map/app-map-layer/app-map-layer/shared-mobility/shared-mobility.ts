import { OJP_VERSION } from '../../../../config/constants';
import { AnyPlace } from '../../../../shared/models/place/place-builder';
import { Poi, RestrictionPoiOSMTag } from '../../../../shared/models/place/poi';

// https://github.com/SFOE/sharedmobility/blob/main/providers.csv
type SharedMobilityProvider = '2EM Car Sharing' | 'Bird' | 'Bolt' | 'Carvelo2go' | 'Donkey Republic'
  | 'E-drive Car Sharing' | 'JM Fleets' | 'LIEmobil' | 'Lime' | 'Mobility' | 'Nextbike'
  | 'Pick-e-Bike' | 'PubliBike' | 'Regivelo.ch' | 'Share Birrer' | 'Sponti-Car' | 'TIER' | 'VOI' | 'invia BikeShare' | 'Velospot'
  | 'Share Birrer' | 'MyBuxi';

type VehicleType = 'Car' | 'E-Car' | 'Bike' | 'E-Bike' | 'E-CargoBike' | 'E-Scooter' | 'E-Moped'

export class SharedMobility {
  public poiType: RestrictionPoiOSMTag
  public vehicleType: VehicleType
  public provider: SharedMobilityProvider
  public code: string
  public name: string
  public hireFacility: string | null
  public isFixedStation: boolean
  public docksNo: number | null
  public vehiclesNo: number | null
  public vehicleName: string | null

  private constructor(
    poiType: RestrictionPoiOSMTag,
    vehicleType: VehicleType,
    provider: SharedMobilityProvider,
    code: string,
    name: string,
  ) {
    this.poiType = poiType
    this.vehicleType = vehicleType
    this.provider = provider
    this.code = code
    this.name = name

    this.hireFacility = null
    this.isFixedStation = false
    this.docksNo = null
    this.vehiclesNo = null
    this.vehicleName = null
  }

  public static initFromPlace(place: AnyPlace): SharedMobility | null {
    if (place.type !== 'poi') {
      return null;
    }

    const isOJPv2 = OJP_VERSION === '2.0';

    const poi = place as Poi;

    const poiCategory = poi.category;

    const code: string = (() => {
      const attrCode = poi.properties['code'] ?? null;
      if (attrCode !== null) {
        return attrCode;
      }

      const poiCode = poi.publicCode;
      return poiCode;
    })();

    const vehicleType: VehicleType | null = (() => {
      if (poi.category === 'escooter_rental') {
        return 'E-Scooter';
      }
      if (poi.category === 'bicycle_rental') {
        return 'E-Bike';
      }
      if (poi.category === 'car_sharing') {
        return 'Car';
      }

      return null;
    })();

    if (vehicleType === null) {
      console.error('CANT DETECT vehicleType');
      console.log(place);
      return null;
    }

    // see https://github.com/SFOE/sharedmobility/blob/main/providers.csv
    const provider: SharedMobilityProvider | null = (() => {
      const providerName: SharedMobilityProvider | null = (() => {
        if (isOJPv2) {
          const operatorNameLC: string = (place.properties['OPERATOR_NAME'] ?? 'n/a').toLowerCase();
          if (operatorNameLC.startsWith('bird')) {
            return 'Bird';
          }
          if (operatorNameLC.startsWith('bolt')) {
            return 'Bolt';
          }
          if (operatorNameLC.startsWith('lime')) {
            return 'Lime';
          }
          if (operatorNameLC.startsWith('voi')) {
            return 'VOI';
          }
          if (operatorNameLC.startsWith('share birrer')) {
            return 'Share Birrer';
          }
          if (operatorNameLC.startsWith('mobility')) {
            return 'Mobility';
          }
          if (operatorNameLC.startsWith('edrive carsharing')) {
            return 'E-drive Car Sharing';
          }
          if (operatorNameLC.startsWith('2em')) {
            return '2EM Car Sharing';
          }
          if (operatorNameLC.startsWith('mybuxi')) {
            return 'MyBuxi';
          }
          if (operatorNameLC === 'donkey republic') {
            return 'Donkey Republic';
          }
          if (operatorNameLC === 'nextbike') {
            return 'Nextbike';
          }
          if (operatorNameLC === 'velospot') {
            return 'Velospot';
          }
          if (operatorNameLC === 'pick-e-bike') {
            return 'Pick-e-Bike';
          }
        } else {
          const placeNameLC = (poi.placeName ?? 'n/a').toLowerCase();
          if (placeNameLC.startsWith('bolt')) {
            return 'Bolt';
          }
          if (placeNameLC.startsWith('lime')) {
            return 'Lime';
          }
          if (placeNameLC.startsWith('voi')) {
            return 'VOI';
          }
          if (placeNameLC.startsWith('bird')) {
            return 'Bird';
          }
          if (placeNameLC.includes('nextbike')) {
            return 'Nextbike';
          }
          if (placeNameLC.includes('invia')) {
            return 'invia BikeShare';
          }
          if (placeNameLC.includes('mobility')) {
            return 'Mobility';
          }
          if (placeNameLC.includes('edrive carsharing')) {
            return 'E-drive Car Sharing';
          }
          if (placeNameLC.includes('2em')) {
            return '2EM Car Sharing';
          }

          const infoURL: string = poi.properties['infoURL'] ?? 'n/a';
          if (infoURL.includes('dnky.bike')) {
            return 'Donkey Republic';
          }
          if (infoURL.includes('publibike.ch')) {
            return 'PubliBike';
          }
          if (infoURL.includes('pickebike')) {
            return 'Pick-e-Bike';
          }
        }
        
        return null;
      })();

      return providerName;
    })();

    if (provider === null) {
      console.error('CANT DETECT provider');
      console.log(place);
      return null;
    }

    const name: string | null = (() => {
      if (provider === '2EM Car Sharing') {
        return provider;
      }
      
      if (poiCategory === 'bicycle_rental' || poiCategory === 'car_sharing' || poiCategory === 'escooter_rental') {
        return poi.name;
      }

      return null;
    })()
    if (name === null) {
      console.error('CANT find name');
      console.log(place);
      return null;
    }

    const vehicle = new SharedMobility(poiCategory, vehicleType, provider, code, name);

    const mapAdditionalInformation = place.properties;

    const docksNoS = mapAdditionalInformation['numDocksAvailable'] ?? null;
    if (docksNoS !== null) {
      vehicle.docksNo = parseInt(docksNoS, 10);
    }
    const vehiclesNoS = mapAdditionalInformation['numVehiclesAvailable'] ?? null;
    if (vehiclesNoS !== null) {
      vehicle.isFixedStation = true;
      vehicle.vehiclesNo = parseInt(vehiclesNoS, 10);
    }

    vehicle.hireFacility = mapAdditionalInformation['hireFacility'] ?? null;

    if (provider === '2EM Car Sharing') {
      vehicle.vehicleName = poi.name;
    }

    return vehicle;
  }

  public computeProviderLabel(): string {
    if (this.provider === '2EM Car Sharing') {
      return '2EM Car'
    }
    if (this.provider === 'Carvelo2go') {
      return 'Carvelo'
    }
    if (this.provider === 'E-drive Car Sharing') {
      return 'E-drive'
    }
    if (this.provider === 'Donkey Republic') {
      return 'Donkey Rep.'
    }

    return this.provider;
  }
}
