export type APP_Stage = 'TEST' | 'PROD'

export interface StageConfig {
  apiEndpoint: string
  authBearerKey: string
  logAPIRequests: boolean
}

export const APP_Stages: Record<APP_Stage, StageConfig> = {
  'PROD': {
    apiEndpoint: 'https://api.opentransportdata.swiss/ojp2020',
    authBearerKey: '57c5dbbbf1fe4d000100001842c323fa9ff44fbba0b9b925f0c052d1',
    logAPIRequests: false,
  },
  'TEST': {
    apiEndpoint: 'https://odpch-test.cloud.tyk.io/ojp-test',
    authBearerKey: '57c5dadd5e6307000100005ead6b87d5ec4f48d3ad5f9414e92907d4',
    logAPIRequests: true,
  }
}
