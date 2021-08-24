export type APP_Stage = 'TEST' | 'PROD' | 'TEST LA'

export interface StageConfig {
  key: APP_Stage
  apiEndpoint: string
  authBearerKey: string
}

export const APP_Stages: StageConfig[] = [
  {
    key: 'PROD',
    apiEndpoint: 'https://api.opentransportdata.swiss/ojp2020',
    authBearerKey: '57c5dbbbf1fe4d000100001842c323fa9ff44fbba0b9b925f0c052d1',
  },
  {
    key: 'TEST',
    apiEndpoint: 'https://odpch-test.cloud.tyk.io/ojp-test',
    authBearerKey: '57c5dadd5e6307000100005ead6b87d5ec4f48d3ad5f9414e92907d4',
  },
  {
    key: 'TEST LA',
    // apiEndpoint: 'https://odpch-test.cloud.tyk.io/la_test_active_server',
    apiEndpoint: 'https://www.webgis.ro/tmp/cors-proxy?url=https://odpch-test.cloud.tyk.io/la_test_active_server',
    authBearerKey: '57c5dadd5e6307000100005e0e0520340d05419b8c1f13c17a20a8ab',
  }
]
