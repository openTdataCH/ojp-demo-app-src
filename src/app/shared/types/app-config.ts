import * as OJP from 'ojp-sdk-v2';
export interface AppConfig {
    stages: Record<string, OJP.ApiConfig>,
};
