import * as OJP from '../shared/ojp-sdk/index'

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
