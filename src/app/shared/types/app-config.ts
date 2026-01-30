import * as OJP_Next from 'ojp-sdk-next';

export interface AppConfig {
    stages: Record<string, OJP_Next.HTTPConfig>,
};
