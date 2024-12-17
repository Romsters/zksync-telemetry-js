import { TelemetryKeys } from './types';
export declare class Telemetry {
    private config;
    private posthog?;
    private sentryInitialized;
    private constructor();
    static initialize(appName: string, keys: TelemetryKeys, customConfigPath?: string): Promise<Telemetry>;
    trackEvent(eventName: string, properties?: Record<string, any>): Promise<void>;
    trackError(error: Error, context?: Record<string, any>): void;
    updateConsent(enabled: boolean): Promise<void>;
    shutdown(): Promise<void>;
}
