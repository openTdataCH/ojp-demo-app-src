export type APP_Stage = 'TEST' | 'PROD' | 'TEST LA'

export interface StageConfig {
    key: APP_Stage
    apiEndpoint: string
    authBearerKey: string
}