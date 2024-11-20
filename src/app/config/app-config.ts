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

export type APP_STAGE = OJP.Default_APP_Stage | 'PROD-LB' | 'OJP-SI'

export const DEFAULT_APP_STAGE: APP_STAGE = 'PROD';

export interface AppMapLayerOptions {
  LIR_Restriction_Type: OJP.RestrictionType
  LIR_POI_Type?: OJP.POI_Restriction | null
  minZoom: number
  layer_ids?: string[] | null,
  click_layer_ids?: string[] | 'SAME_AS_LAYER_IDS' | null
}

const app_stages: OJP.StageConfig[] = [
  {
    key: 'PROD',
    apiEndpoint: 'https://api.opentransportdata.swiss/ojp2020',
    authBearerKey: 'eyJvcmciOiI2NDA2NTFhNTIyZmEwNTAwMDEyOWJiZTEiLCJpZCI6Ijk0YTFhNjExYjM5ZjQ4MWNiMGI5MjFiNTgyNmM1ZGFjIiwiaCI6Im11cm11cjEyOCJ9',
  },
  {
    key: 'INT',
    apiEndpoint: 'https://odpch-api.clients.liip.ch/ojp-passiv-int',
    authBearerKey: 'eyJvcmciOiI2M2Q4ODhiMDNmZmRmODAwMDEzMDIwODkiLCJpZCI6ImJkOTNmYzA1ZGMwYzQwM2Q4MWYzMmFhNWMxNWZjMjU2IiwiaCI6Im11cm11cjEyOCJ9',
  },
  {
    key: 'TEST',
    apiEndpoint: 'https://odpch-api.clients.liip.ch/ojp-test',
    authBearerKey: 'eyJvcmciOiI2M2Q4ODhiMDNmZmRmODAwMDEzMDIwODkiLCJpZCI6ImZlYWJiMjEzZDcyZTRhYmM5N2RhYWJiZDM5YWZmZWIwIiwiaCI6Im11cm11cjEyOCJ9',
  },
  {
    key: 'LA Beta',
    apiEndpoint: 'https://api.opentransportdata.swiss/ojp-la-aktiv',
    authBearerKey: 'eyJvcmciOiI2NDA2NTFhNTIyZmEwNTAwMDEyOWJiZTEiLCJpZCI6ImE5ZDFkYmI4YWVjMDRiYjFiZjA2ZmUyNmZmZTk2YTY2IiwiaCI6Im11cm11cjEyOCJ9',
  },
  {
    key: 'OJP-SI',
    apiEndpoint: 'https://dev.simo.si/OpenAPI/LinkingAlpsBetaPhase/OJP',
    authBearerKey: 'noKey',
  },
]

const map_app_map_layers: Record<string, AppMapLayerOptions> = {
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

export const APP_CONFIG = {
  app_stages: app_stages,
  map_app_map_layers: map_app_map_layers,
}

export const TRIP_REQUEST_DEFAULT_NUMBER_OF_RESULTS = 5;
