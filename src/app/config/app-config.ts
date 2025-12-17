import { AppConfig } from '../shared/types/app-config';

export const APP_CONFIG: AppConfig = {
  stages: {
    // OJP 1.0
    'PROD': {
      url: 'https://api.opentransportdata.swiss/ojp2020',
      authToken: "PLACEHOLDER_REPLACE__PROD",
    },
    'INT': {
      url: 'https://odpch-api.clients.liip.ch/ojp-passiv-int',
      authToken: "PLACEHOLDER_REPLACE__INT",
    },
    'TEST': {
      url: 'https://odpch-api.clients.liip.ch/ojp-test',
      authToken: "PLACEHOLDER_REPLACE__TEST",
    },

    // OJP 2.0
    'V2-PROD': {
      url: 'https://api.opentransportdata.swiss/ojp20',
      authToken: "PLACEHOLDER_REPLACE__PROD",
    },
    'V2-INT': {
      url: 'https://odpch-api.clients.liip.ch/ojp20-beta',
      authToken: "PLACEHOLDER_REPLACE__V2_INT",
    },
    'V2-TEST': {
      url: 'https://odpch-api.clients.liip.ch/ojp20-test',
      authToken: "PLACEHOLDER_REPLACE__V2_INT",
    },

    // POCs
    'PROD-LB': {
      url: 'https://tools.odpch.ch/tmp/cors-proxy?url=https://ojp.lb.prod.ojp.odpch.ch/ojp/ojp',
      authToken: "PLACEHOLDER_REPLACE__PROD",
    },
    'LA Beta': {
      url: 'https://api.opentransportdata.swiss/ojp-la-aktiv',
      authToken: "PLACEHOLDER_REPLACE__LA_BETA",
    },
    
    'OJP-SI': {
      url: 'https://dev.simo.si/OpenAPI/LinkingAlpsBetaPhase/OJP',
      authToken: null,
    },
    'GR TEST': {
      url: 'https://tools.odpch.ch/ojp-gr-api',
      authToken: null,
    },
    
    // OJP Fare
    'NOVA-INT': {
      url: 'https://api.opentransportdata.swiss/ojpfare',
      authToken: "PLACEHOLDER_REPLACE__FARE_INT",
    },

    // 2nd shape provider - / at the end is important
    'SHAPE_PROVIDER': {
      url: 'https://api.geops.io/routing/v1/',
      authToken: 'PLACEHOLDER_REPLACE__SHAPE_PROVIDER',
    },
  }
}
