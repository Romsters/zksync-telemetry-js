export interface TelemetryConfig {
    enabled: boolean;
    instanceId: string;
    createdAt: Date;
    configPath?: string;
}
export interface TelemetryKeys {
    posthogKey?: string;
    sentryDsn?: string;
}
export declare class TelemetryError extends Error {
    code: string;
    constructor(message: string, code: string);
}
