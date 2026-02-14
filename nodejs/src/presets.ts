/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import type { SessionConfig, CopilotClientOptions } from "./types.js";

/**
 * Preset configurations for common use cases.
 * Presets provide sensible defaults for different deployment scenarios.
 */

export type PresetName = "cli" | "filesystem" | "minimal";

export interface PresetSessionConfig extends Partial<SessionConfig> {}
export interface PresetClientConfig extends Partial<CopilotClientOptions> {}

export interface PresetConfig {
    client: PresetClientConfig;
    session: PresetSessionConfig;
}

/**
 * Returns a preset configuration for the given scenario.
 *
 * @param name - The preset name
 * @param overrides - Optional overrides to merge on top of the preset
 * @returns Preset configuration for client and session
 *
 * @example
 * ```typescript
 * // Full CLI experience
 * const config = preset("cli");
 * const client = new CopilotClient(config.client);
 * const session = await client.createSession(config.session);
 *
 * // Minimal — just LLM chat, no tools
 * const config = preset("minimal");
 * ```
 */
export function preset(name: PresetName, overrides?: Partial<PresetConfig>): PresetConfig {
    const base = PRESETS[name];
    if (!base) {
        throw new Error(
            `Unknown preset: ${name}. Available presets: ${Object.keys(PRESETS).join(", ")}`
        );
    }

    return {
        client: { ...base.client, ...overrides?.client },
        session: { ...base.session, ...overrides?.session },
    };
}

const PRESETS: Record<PresetName, PresetConfig> = {
    cli: {
        client: {
            useLoggedInUser: true,
            autoStart: true,
            autoRestart: true,
        },
        session: {
            configDiscovery: true,
            agentDiscovery: true,
            sessionStorage: "disk",
        },
    },
    filesystem: {
        client: {
            autoStart: true,
        },
        session: {
            configDiscovery: false,
            agentDiscovery: false,
            sessionStorage: "memory",
        },
    },
    minimal: {
        client: {
            autoStart: true,
        },
        session: {
            configDiscovery: false,
            agentDiscovery: false,
            sessionStorage: "memory",
        },
    },
};
