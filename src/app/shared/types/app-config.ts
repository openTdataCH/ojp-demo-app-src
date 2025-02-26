import * as OJP from 'ojp-sdk'
export interface AppConfig {
    stages: Record<string, OJP.ApiConfig>,
};
