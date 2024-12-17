"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
// src/config.ts
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const types_1 = require("./types");
const utils_1 = require("./utils");
class ConfigManager {
    static getDefaultConfigPath(appName) {
        const configDir = process.platform === 'darwin'
            ? path_1.default.join(process.env.HOME, 'Library', 'Application Support', 'com.matter-labs', appName)
            : path_1.default.join(process.env.HOME, '.config', appName);
        return path_1.default.join(configDir, 'telemetry.json');
    }
    static async load(appName, customPath) {
        const configPath = customPath || this.getDefaultConfigPath(appName);
        try {
            // Check if config exists
            await promises_1.default.access(configPath);
            const content = await promises_1.default.readFile(configPath, 'utf-8');
            return JSON.parse(content);
        }
        catch (error) {
            // Config doesn't exist, create new
            return this.createNew(appName, configPath);
        }
    }
    static async createNew(appName, configPath) {
        // In non-interactive mode, disable telemetry
        if (!(0, utils_1.isInteractive)()) {
            return {
                enabled: false,
                instanceId: (0, uuid_1.v4)(),
                createdAt: new Date(),
                configPath
            };
        }
        // Prompt user for consent
        console.log('Help us improve zkSync by sending anonymous usage data.');
        console.log('We collect:');
        console.log('  - Basic usage statistics');
        console.log('  - Error reports');
        console.log('  - Platform information');
        console.log();
        console.log('We DO NOT collect:');
        console.log('  - Personal information');
        console.log('  - Sensitive configuration');
        console.log('  - Private keys or addresses');
        const enabled = await (0, utils_1.promptYesNo)('Would you like to enable telemetry?');
        const config = {
            enabled,
            instanceId: (0, uuid_1.v4)(),
            createdAt: new Date(),
            configPath
        };
        // Save config
        try {
            await promises_1.default.mkdir(path_1.default.dirname(configPath), { recursive: true });
            await promises_1.default.writeFile(configPath, JSON.stringify(config, null, 2));
        }
        catch (error) {
            throw new types_1.TelemetryError(`Failed to save config: ${error}`, 'CONFIG_SAVE_ERROR');
        }
        return config;
    }
    static async updateConsent(config, enabled) {
        if (!config.configPath) {
            throw new types_1.TelemetryError('No config path specified', 'CONFIG_PATH_ERROR');
        }
        config.enabled = enabled;
        await promises_1.default.writeFile(config.configPath, JSON.stringify(config, null, 2));
    }
}
exports.ConfigManager = ConfigManager;
