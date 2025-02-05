interface AppConfigStage {
    endpoint: string
    authorization: string | null
}

export interface AppConfig {
    stages: Record<string, AppConfigStage>,
};
