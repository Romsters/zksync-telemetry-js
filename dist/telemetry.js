"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Telemetry = void 0;
// src/telemetry.ts
const Sentry = __importStar(require("@sentry/node"));
const types_1 = require("./types");
const config_1 = require("./config");
const posthog_node_1 = require("posthog-node"); // Use named import instead
class Telemetry {
    constructor(config, posthogClient) {
        this.sentryInitialized = false;
        this.config = config;
        this.posthog = posthogClient;
    }
    static async initialize(appName, keys, customConfigPath) {
        // Load or create config
        const config = await config_1.ConfigManager.load(appName, customConfigPath);
        // Only initialize clients if telemetry is enabled
        if (config.enabled) {
            // Initialize PostHog if key provided
            let posthogClient;
            if (keys.posthogKey) {
                posthogClient = new posthog_node_1.PostHog(keys.posthogKey, {
                    host: 'https://app.posthog.com',
                });
            }
            // Initialize Sentry if DSN provided
            if (keys.sentryDsn) {
                Sentry.init({
                    dsn: keys.sentryDsn,
                    release: process.env.npm_package_version,
                    initialScope: {
                        tags: {
                            app: appName,
                            version: process.env.npm_package_version || 'unknown',
                            platform: process.platform
                        }
                    }
                });
            }
            return new Telemetry(config, posthogClient);
        }
        // Return instance with no clients if telemetry is disabled
        return new Telemetry(config);
    }
    async trackEvent(eventName, properties = {}) {
        if (!this.config.enabled || !this.posthog) {
            return;
        }
        try {
            // Add default properties
            const enrichedProperties = {
                ...properties,
                distinct_id: this.config.instanceId,
                platform: process.platform,
                version: process.env.npm_package_version || 'unknown',
                node_version: process.version
            };
            await this.posthog.capture({
                distinctId: this.config.instanceId,
                event: eventName,
                properties: enrichedProperties
            });
        }
        catch (error) {
            throw new types_1.TelemetryError(`Failed to track event: ${error}`, 'EVENT_TRACKING_ERROR');
        }
    }
    trackError(error, context = {}) {
        if (!this.config.enabled || !this.sentryInitialized) {
            return;
        }
        Sentry.withScope((scope) => {
            // Add context as extra data
            scope.setExtras({
                ...context,
                platform: process.platform,
                version: process.env.npm_package_version,
                instanceId: this.config.instanceId
            });
            Sentry.captureException(error);
        });
    }
    async updateConsent(enabled) {
        await config_1.ConfigManager.updateConsent(this.config, enabled);
        this.config.enabled = enabled;
    }
    async shutdown() {
        if (this.posthog) {
            await this.posthog.shutdown();
        }
        if (this.sentryInitialized) {
            await Sentry.close(2000); // Wait up to 2 seconds
        }
    }
}
exports.Telemetry = Telemetry;
