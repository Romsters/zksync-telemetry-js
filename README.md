# ZKSync Telemetry for TypeScript
Complete guide for integrating telemetry in TypeScript CLI applications.

## Table of Contents
- [Installation](#installation)
- [Basic Setup](#basic-setup)
- [Advanced Usage](#advanced-usage)
- [Environment Management](#environment-management)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [API Reference](#api-reference)

## Installation

```bash
# Using npm
npm install zksync-telemetry

# Using yarn
yarn add zksync-telemetry

# Using pnpm
pnpm add zksync-telemetry
```

## Basic Setup

### 1. Initialize Telemetry
```typescript
import { Telemetry } from 'zksync-telemetry';

async function main() {
  const telemetry = await Telemetry.initialize(
    'your-cli-name',                    
    {
      posthogKey: process.env.ANVIL_POSTHOG_KEY,  
      sentryDsn: process.env.ANVIL_SENTRY_DSN,  
    }
  );
}
```

### 2. Track Events
```typescript
// Track simple event
await telemetry.trackEvent('command_executed', {
  command: 'deploy'
});

// Track event with more context
await telemetry.trackEvent('deployment_completed', {
  environment: 'production',
  duration_ms: 1500,
  cache_enabled: true,
  custom_port: false
});
```

### 3. Track Errors
```typescript
try {
  await deployContract();
} catch (error) {
  telemetry.trackError(error as Error, {
    command: 'deploy',
    network: 'mainnet',
    last_action: 'contract_verification'
  });
  throw error;
}
```

### 4. Clean Shutdown
```typescript
// In your cleanup code
process.on('SIGINT', async () => {
  await telemetry.shutdown();
  process.exit(0);
});
```

## Advanced Usage

### Command Tracking Pattern
```typescript
import { Command } from 'commander';  // or your CLI framework
import { Telemetry } from 'zksync-telemetry';

class CLI {
  private telemetry: Telemetry;

  async initialize() {
    this.telemetry = await Telemetry.initialize('your-cli', {
      posthogKey: process.env.ANVIL_POSTHOG_KEY,
      sentryDsn: process.env.ANVIL_SENTRY_DSN
    });

    const program = new Command();

    program
      .command('deploy')
      .option('-e, --environment <env>', 'deployment environment')
      .action(async (options) => {
        await this.trackCommand('deploy', options);
        try {
          // Command implementation
          await this.deploy(options);
        } catch (error) {
          await this.handleError('deploy', error as Error, options);
          throw error;
        }
      });
  }

  private async trackCommand(
    command: string, 
    options: Record<string, any>
  ) {
    await this.telemetry.trackEvent('command_executed', {
      command,
      ...this.sanitizeOptions(options)
    });
  }

  private async handleError(
    command: string, 
    error: Error, 
    context: Record<string, any>
  ) {
    this.telemetry.trackError(error, {
      command,
      ...this.sanitizeOptions(context)
    });
  }

  private sanitizeOptions(options: Record<string, any>): Record<string, any> {
    // Remove sensitive data
    const { privateKey, password, secret, ...safeOptions } = options;
    return safeOptions;
  }
}
```

### User Consent Management
```typescript
// Check if user has consented
const telemetry = await Telemetry.initialize('your-cli', {
  posthogKey: process.env.ANVIL_POSTHOG_KEY
});

// Update consent
await telemetry.updateConsent(false);  // Disable telemetry
await telemetry.updateConsent(true);   // Enable telemetry
```

## Environment Management

### Environment-Specific Configuration
```typescript
// config/environments.ts
export const getTelemetryConfig = () => {
  switch (process.env.NODE_ENV) {
    case 'production':
      return {
        posthogKey: process.env.PROD_POSTHOG_KEY,
        sentryDsn: process.env.PROD_SENTRY_DSN
      };
    case 'staging':
      return {
        posthogKey: process.env.STAGING_POSTHOG_KEY,
        sentryDsn: process.env.STAGING_SENTRY_DSN
      };
    default:
      return {
        posthogKey: process.env.DEV_POSTHOG_KEY,
        sentryDsn: process.env.DEV_SENTRY_DSN
      };
  }
};
```

## Best Practices

### 1. Data Privacy
```typescript
// Good - sanitized data
telemetry.trackEvent('wallet_connected', {
  network: 'mainnet',
  has_funds: true,
  transaction_count: 5
});

// Bad - sensitive data
telemetry.trackEvent('wallet_connected', {
  address: '0x123...',  // PII
  private_key: '...',   // Sensitive
  balance: '1000'       // Sensitive
});
```

## API Reference

### Telemetry Class
```typescript
class Telemetry {
  static initialize(
    appName: string,
    keys: TelemetryKeys,
    customConfigPath?: string
  ): Promise<Telemetry>;

  trackEvent(
    eventName: string,
    properties?: Record<string, any>
  ): Promise<void>;

  trackError(
    error: Error,
    context?: Record<string, any>
  ): void;

  updateConsent(enabled: boolean): Promise<void>;
  
  shutdown(): Promise<void>;
}
```