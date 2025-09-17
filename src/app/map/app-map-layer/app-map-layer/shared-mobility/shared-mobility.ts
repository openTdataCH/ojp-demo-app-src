import OJP_Legacy from '../../../../config/ojp-legacy';

// https://github.com/SFOE/sharedmobility/blob/main/providers.csv
type SharedMobilityProvider = '2EM Car Sharing' | 'Bird' | 'Bolt' | 'Carvelo2go' | 'Donkey Republic'
  | 'E-drive Car Sharing' | 'JM Fleets' | 'LIEmobil' | 'Lime' | 'Mobility' | 'Nextbike'
  | 'Pick-e-Bike' | 'PubliBike' | 'Regivelo.ch' | 'Share Birrer' | 'Sponti-Car' | 'TIER' | 'VOI';

type VehicleType = 'Car' | 'E-Car' | 'Bike' | 'E-Bike' | 'E-CargoBike' | 'E-Scooter' | 'E-Moped'

export class SharedMobility {
  public poiType: OJP_Legacy.RestrictionPoiOSMTag
  public vehicleType: VehicleType
  public provider: SharedMobilityProvider
  public code: string
  public name: string
  public hireFacility: string | null
  public isFixedStation: boolean
  public docksNo: number | null
  public vehiclesNo: number | null
  public vehicleName: string | null

  constructor(
    poiType: OJP_Legacy.RestrictionPoiOSMTag,
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

  public static initFromLocation(location: OJP_Legacy.Location): SharedMobility | null {
    if (location.poi === null) {
      return null;
    }

    const poiCategory = location.poi.category;

    const code: string = (() => {
      const attrCode = location.attributes['Code'] ?? null;
      if (attrCode !== null) {
        return attrCode;
      }

      const poiCode = location.poi['code'];
      return poiCode;
    })();

    // see https://github.com/SFOE/sharedmobility/blob/main/providers.csv
    const providerData: [SharedMobilityProvider | null, VehicleType] = (() => {
      if (poiCategory === 'bicycle_rental') {
        if (location.locationName === 'Publibike') {
          return ['PubliBike', 'Bike']
        }

        if (location.locationName === 'Publiebike') {
          return ['PubliBike', 'E-Bike']
        }

        if (location.locationName === 'Nextbike') {
          return ['Nextbike', 'Bike']
        }
      }

      if (code.startsWith('2em_cars')) {
        return ['2EM Car Sharing', 'Car']
      }

      if (code.startsWith('2em_cars_e')) {
        return ['2EM Car Sharing', 'E-Car']
      }

      if (code.startsWith('bird-')) {
        return ['Bird', 'E-Scooter']
      }

      if (code.startsWith('bolt_')) {
        return ['Bolt', 'E-Scooter']
      }

      if (code.startsWith('carvelo2go')) {
        return ['Carvelo2go', 'E-CargoBike']
      }

      if (code.startsWith('donkey_kreuzlingen')) {
        return ['Regivelo.ch', 'Bike']
      }

      if (code.startsWith('donkey_')) {
        return ['Donkey Republic', 'Bike']
      }

      if (code.startsWith('edrivecarsharing')) {
        return ['E-drive Car Sharing', 'E-Car']
      }

      if (code.startsWith('bird-platform-partner-jmfleetswl-')) {
        return ['JM Fleets', 'E-Scooter']
      }

      if (code.startsWith('liemobil_liechtenstein_ebike')) {
        return ['LIEmobil', 'E-Bike']
      }

      if (code.startsWith('lime_')) {
        if (code.includes('_escooter')) {
          return ['Lime', 'E-Scooter']
        } else {
          return ['Lime', 'E-Bike']
        }
      }

      if (code.startsWith('mobility')) {
        return ['Mobility', 'Car']
      }

      if (code.startsWith('emobility')) {
        return ['Mobility', 'E-Car']
      }

      if (code.startsWith('nextbike_ch')) {
        return ['Nextbike', 'Bike']
      }

      if (code.startsWith('pickebike_')) {
        if (code.includes('_emoped')) {
          return ['Pick-e-Bike', 'E-Moped']
        } else {
          return ['Pick-e-Bike', 'E-Bike']
        }
      }

      if (code.startsWith('share_birrer_ch')) {
        return ['Share Birrer', 'E-Car']
      }

      if (code.startsWith('sponticar')) {
        return ['Sponti-Car', 'E-Car']
      }

      if (code.startsWith('tier')) {
        return ['TIER', 'E-Scooter']
      }

      if (code.startsWith('tier_ebike')) {
        return ['TIER', 'E-Bike']
      }

      if (code.startsWith('voiscooters.com')) {
        return ['VOI', 'E-Scooter']
      }

      return [null, 'E-Scooter']
    })()
    const provider = providerData[0]
    const vehicleType = providerData[1]

    if (provider === null) {
      console.error('CANT DETECT provider');
      console.log(location);
      return null;
    }

    const name: string | null = (() => {
      if (provider === '2EM Car Sharing') {
        return provider
      }
      
      if (poiCategory === 'bicycle_rental' || poiCategory === 'car_sharing' || poiCategory === 'escooter_rental') {
        return location.poi.name;
      }

      return null;
    })()
    if (name === null) {
      console.error('CANT find name');
      console.log(location);
      return null;
    }

    const vehicle = new SharedMobility(poiCategory, vehicleType, provider, code, name);

    const docksNoS = location.attributes['num_docks_available'] ?? null;
    if (docksNoS !== null) {
      vehicle.docksNo = parseInt(docksNoS, 10);
    }
    const vehiclesNoS = location.attributes['num_vehicles_available'] ?? null;
    if (vehiclesNoS !== null) {
      vehicle.isFixedStation = true
      vehicle.vehiclesNo = parseInt(vehiclesNoS, 10);
    }

    vehicle.hireFacility = location.attributes['HireFacility'] ?? null;

    if (provider === '2EM Car Sharing') {
      vehicle.vehicleName = location.poi.name;
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
