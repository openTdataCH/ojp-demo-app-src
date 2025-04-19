import OJP_Legacy from '../../config/ojp-legacy';
export interface AppConfig {
    stages: Record<string, OJP_Legacy.ApiConfig>,
};
