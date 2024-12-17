// src/telemetry.ts
import * as Sentry from '@sentry/node';
import { TelemetryConfig, TelemetryError, TelemetryKeys } from './types';
import { ConfigManager } from './config';
import { PostHog } from 'posthog-node';  // Use named import instead

export class Telemetry {
  private config: TelemetryConfig;
  private posthog?: PostHog;  // PostHog type is available directly
  private sentryInitialized: boolean = false;

  private constructor(
    config: TelemetryConfig,
    posthogClient?: PostHog
  ) {
    this.config = config;
    this.posthog = posthogClient;
  }

  static async initialize(
    appName: string,
    keys: TelemetryKeys,
    customConfigPath?: string
  ): Promise<Telemetry> {
    const config = await ConfigManager.load(appName, customConfigPath);

    // Only initialize clients if telemetry is enabled
    if (config.enabled) {
      let posthogClient: PostHog | undefined;
      let sentryInitialized = false;  // Track Sentry initialization

      if (keys.posthogKey) {
        posthogClient = new PostHog(
          keys.posthogKey,
          {
            host: 'https://app.posthog.com',
          }
        );
      }

      if (keys.sentryDsn) {
        try {
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
          sentryInitialized = true;  // Mark as initialized if successful
        } catch (error) {
          console.error('Failed to initialize Sentry:', error);
          // Optionally handle initialization failure
        }
      }

      const telemetry = new Telemetry(config, posthogClient);
      telemetry.sentryInitialized = sentryInitialized;  // Set the initialization status
      return telemetry;
    }

    return new Telemetry(config);
  }

  async trackEvent(
    eventName: string,
    properties: Record<string, any> = {}
  ): Promise<void> {
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
    } catch (error) {
      throw new TelemetryError(
        `Failed to track event: ${error}`,
        'EVENT_TRACKING_ERROR'
      );
    }
  }

  trackError(error: Error, context: Record<string, any> = {}): void {
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

  async updateConsent(enabled: boolean): Promise<void> {
    await ConfigManager.updateConsent(this.config, enabled);
    this.config.enabled = enabled;
  }

  async shutdown(): Promise<void> {
    if (this.posthog) {
      await this.posthog.shutdown();
    }
    
    if (this.sentryInitialized) {
      await Sentry.close(2000); // Wait up to 2 seconds
    }
  }
}