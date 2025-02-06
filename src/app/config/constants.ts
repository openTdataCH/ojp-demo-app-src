import * as OJP from 'ojp-sdk'

type DEBUG_LEVEL_Type = 'DEBUG' | 'PROD'
export const DEBUG_LEVEL: DEBUG_LEVEL_Type = (() => {
  const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
  if (!isBrowser) {
      return 'PROD';
  }

  if (window.location.hostname.includes('github.io')) {
      return 'PROD';
  }

  return 'DEBUG';
})();

// TODO - reflect this also to v1
export type APP_STAGE = 'PROD' | 'INT' | 'TEST' | 'LA Beta' 
  | 'V2-PROD' | 'V2-INT' | 'V2-TEST'
  | 'GR TEST'| 'PROD-LB' | 'OJP-SI' | 'NOVA-INT';

export const DEFAULT_APP_STAGE: APP_STAGE = 'V2-PROD';

export interface AppMapLayerOptions {
  LIR_Restriction_Type: OJP.RestrictionType
  LIR_POI_Type?: OJP.POI_Restriction | null
  minZoom: number
  layer_ids?: string[] | null,
  click_layer_ids?: string[] | 'SAME_AS_LAYER_IDS' | null
}

export const MAP_APP_MAP_LAYERS: Record<string, AppMapLayerOptions> = {
  'stops': {
    LIR_Restriction_Type: 'stop',
    minZoom: 13,
    layer_ids: [
      'stops-circle',
      'stops-label',
    ],
    click_layer_ids: 'SAME_AS_LAYER_IDS',
  },
  'addresses': {
    LIR_Restriction_Type: 'address',
    minZoom: 17,
    layer_ids: [
      'address-circle',
    ],
    click_layer_ids: 'SAME_AS_LAYER_IDS',
  },
  'topographic_places': {
    LIR_Restriction_Type: 'topographicPlace',
    minZoom: 12,
    layer_ids: [
      'topographic-place-circle',
    ],
    click_layer_ids: 'SAME_AS_LAYER_IDS',
  },
  'sharing_cars': {
    LIR_Restriction_Type: 'poi',
    LIR_POI_Type: {
      poiType: 'shared_mobility',
      tags: ['car_sharing']
    },
    minZoom: 12,
    layer_ids: [
      'car-rental-icon',
      'car-rental-text-number',
      'car-rental-text-provider',
    ],
    click_layer_ids: 'SAME_AS_LAYER_IDS',
  },
  'sharing_bicycles': {
    LIR_Restriction_Type: 'poi',
    LIR_POI_Type: {
      poiType: 'shared_mobility',
      tags: ['bicycle_rental']
    },
    minZoom: 14,
    layer_ids: [
      'bike-icon',
      'bike-text-number',
      'bike-text-provider',
    ],
    click_layer_ids: 'SAME_AS_LAYER_IDS',
  },
  'sharing_scooters': {
    LIR_Restriction_Type: 'poi',
    LIR_POI_Type: {
      poiType: 'shared_mobility',
      tags: ['escooter_rental']
    },
    minZoom: 14,
    layer_ids: [
      'scooter-icon',
      'scooter-text-number',
      'scooter-text-provider',
    ],
    click_layer_ids: 'SAME_AS_LAYER_IDS',
  },
  'charging_stations': {
    LIR_Restriction_Type: 'poi',
    LIR_POI_Type: {
      poiType: 'shared_mobility',
      tags: ['charging_station']
    },
    minZoom: 12,
    layer_ids: [
      'charging-station-icon',
      'charging-station-text-number',
      'charging-station-text-provider',
    ],
    click_layer_ids: 'SAME_AS_LAYER_IDS',
  },
  'sbb_services': {
    LIR_Restriction_Type: 'poi',
    LIR_POI_Type: {
      poiType: 'shared_mobility',
      tags: ['sbb_services']
    },
    minZoom: 12,
    layer_ids: [
      'charging-station-icon',
      'charging-station-text-number',
      'charging-station-text-provider',
    ],
    click_layer_ids: 'SAME_AS_LAYER_IDS',
  },
  'pois_other': {
    LIR_Restriction_Type: 'poi',
    LIR_POI_Type: {
      poiType: 'shared_mobility',
      tags: ['other']
    },
    minZoom: 12,
    layer_ids: [
      'charging-station-icon',
      'charging-station-text-number',
      'charging-station-text-provider',
    ],
    click_layer_ids: 'SAME_AS_LAYER_IDS',
  },
  'pois-ALL': {
    LIR_Restriction_Type: 'poi',
    LIR_POI_Type: {
      poiType: 'poi',
      tags: ['service', 'shopping', 'leisure', 'catering', 'public', 'parkride', 'accommodation']
    },
    minZoom: 16,
    layer_ids: [
      'poi-all',
    ],
    click_layer_ids: 'SAME_AS_LAYER_IDS',
  },
}

export const TRIP_REQUEST_DEFAULT_NUMBER_OF_RESULTS = 5;
