import * as OJP from 'ojp-sdk-v1';
export interface AppConfig {
    stages: Record<string, OJP.ApiConfig>,
};
