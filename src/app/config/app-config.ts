import { AppConfig } from '../shared/types/app-config'

export const APP_CONFIG: AppConfig = {
  stages: {
    'PROD': {
      url: 'https://api.opentransportdata.swiss/ojp2020',
      authToken: null,
    },
    'PROD-LB': {
      url: 'https://tools.odpch.ch/tmp/cors-proxy?url=https://ojp.lb.prod.ojp.odpch.ch/ojp/ojp',
      authToken: null,
    },
    'INT': {
      url: 'https://odpch-api.clients.liip.ch/ojp-passiv-int',
      authToken: null,
    },
    'TEST': {
      url: 'https://odpch-api.clients.liip.ch/ojp-test',
      authToken: null,
    },
    'LA Beta': {
      url: 'https://api.opentransportdata.swiss/ojp-la-aktiv',
      authToken: null,
    },
    'OJP-SI': {
      url: 'https://dev.simo.si/OpenAPI/LinkingAlpsBetaPhase/OJP',
      authToken: null,
    },

    'V2-PROD': {
      url: 'https://api.opentransportdata.swiss/ojp20',
      authToken: null,
    },
    'V2-INT': {
      url: 'https://odpch-api.clients.liip.ch/ojp20-beta',
      authToken: null,
    },
    'V2-TEST': {
      url: 'https://odpch-api.clients.liip.ch/ojp20-test',
      authToken: null,
    },
    
    'NOVA-INT': {
      url: 'https://api.opentransportdata.swiss/ojpfare',
      authToken: null,
    },
  }
}
