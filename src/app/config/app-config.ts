import { AppConfig } from '../shared/types/app-config'

export const APP_CONFIG: AppConfig = {
  stages: {
    'PROD': {
      endpoint: 'https://api.opentransportdata.swiss/ojp2020',
      authorization: 'PLACEHOLDER_KEY',
    },
    'PROD-LB': {
      endpoint: 'https://tools.odpch.ch/tmp/cors-proxy?url=https://ojp.lb.prod.ojp.odpch.ch/ojp/ojp',
      authorization: 'PLACEHOLDER_KEY',
    },
    'INT': {
      endpoint: 'https://odpch-api.clients.liip.ch/ojp-passiv-int',
      authorization: 'PLACEHOLDER_KEY',
    },
    'TEST': {
      endpoint: 'https://odpch-api.clients.liip.ch/ojp-test',
      authorization: 'PLACEHOLDER_KEY',
    },
    'LA Beta': {
      endpoint: 'https://api.opentransportdata.swiss/ojp-la-aktiv',
      authorization: 'PLACEHOLDER_KEY',
    },
    'OJP-SI': {
      endpoint: 'https://dev.simo.si/OpenAPI/LinkingAlpsBetaPhase/OJP',
      authorization: 'PLACEHOLDER_KEY',
    },
    'NOVA-INT': {
      endpoint: 'https://api.opentransportdata.swiss/ojpfare',
      authorization: 'PLACEHOLDER_KEY',
    },
  }
}
