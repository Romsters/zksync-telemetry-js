import { TelemetryConfig } from './types';
export declare class ConfigManager {
    private static getDefaultConfigPath;
    static load(appName: string, customPath?: string): Promise<TelemetryConfig>;
    private static createNew;
    static updateConsent(config: TelemetryConfig, enabled: boolean): Promise<void>;
}
