import * as OJP from '../shared/ojp-sdk/index'

export interface AppMapLayerOptions {
    LIR_Restriction_Type: OJP.GeoRestrictionType
    LIR_POI_Type?: null | OJP.GeoRestrictionPoiOSMTag
    minZoom: number
    layer_ids: string[],
    click_layer_ids?: string[] | 'SAME_AS_LAYER_IDS' | null
}

const app_stages: Record<OJP.APP_Stage, OJP.StageConfig> = {
    'PROD': {
      key: 'PROD',
      apiEndpoint: 'https://api.opentransportdata.swiss/ojp2020',
      authBearerKey: '57c5dbbbf1fe4d0001000018e0f7158cb2b347e3a6745e3ef949e7bf',
    },
    'TEST': {
      key: 'TEST',
      apiEndpoint: 'https://odpch-test.cloud.tyk.io/ojp-test/',
      authBearerKey: '57c5dadd5e6307000100005ead6b87d5ec4f48d3ad5f9414e92907d4',
    },
    'TEST LA': {
      key: 'TEST LA',
      apiEndpoint: 'https://odpch-test.cloud.tyk.io/la_test_active_server/',
      authBearerKey: '57c5dadd5e6307000100005e0e0520340d05419b8c1f13c17a20a8ab',
    }
}

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
    'sharing_cars': {
        LIR_Restriction_Type: 'poi',
        LIR_POI_Type: 'car_sharing',
        minZoom: 12,
        layer_ids: [
            'car-rental-icon',
        ],
        click_layer_ids: 'SAME_AS_LAYER_IDS',
    },
    'sharing_bicycles': {
        LIR_Restriction_Type: 'poi',
        LIR_POI_Type: 'bicycle_rental',
        minZoom: 14,
        layer_ids: [
            'bike-icon',
        ],
        click_layer_ids: 'SAME_AS_LAYER_IDS',
    },
    'sharing_scooters': {
        LIR_Restriction_Type: 'poi',
        LIR_POI_Type: 'escooter_rental',
        minZoom: 14,
        layer_ids: [
            'scooter-icon',
        ],
        click_layer_ids: 'SAME_AS_LAYER_IDS',
    },
    'charging_stations': {
        LIR_Restriction_Type: 'poi',
        LIR_POI_Type: 'charging_station',
        minZoom: 12,
        layer_ids: [
            'charging-station-icon',
        ],
        click_layer_ids: 'SAME_AS_LAYER_IDS',
    },
}

export const APP_CONFIG = {
    app_stages: app_stages,
    map_app_map_layers: map_app_map_layers,
}
