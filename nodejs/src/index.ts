/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

/**
 * Copilot SDK - TypeScript/Node.js Client
 *
 * JSON-RPC based SDK for programmatic control of GitHub Copilot CLI
 */

export { CopilotClient } from "./client.js";
export { CopilotSession, type AssistantMessageEvent } from "./session.js";
export { defineTool } from "./types.js";
export { type Transport } from "./transport.js";
export { StdioTransport, type StdioTransportOptions } from "./stdio-transport.js";
export { TcpTransport, parseCliUrl, type TcpTransportOptions } from "./tcp-transport.js";
export {
    WasmTransport,
    WasmConnection,
    type WasmModule,
    type WasmTransportOptions,
} from "./wasm-transport.js";
export {
    preset,
    type PresetName,
    type PresetConfig,
    type PresetSessionConfig,
    type PresetClientConfig,
} from "./presets.js";
export { InMemoryFileSystem, type FileSystemProvider } from "./filesystem.js";
export type {
    ConnectionState,
    CopilotClientOptions,
    CustomAgentConfig,
    ForegroundSessionInfo,
    GetAuthStatusResponse,
    GetStatusResponse,
    InfiniteSessionConfig,
    MCPLocalServerConfig,
    MCPRemoteServerConfig,
    MCPServerConfig,
    MessageOptions,
    ModelBilling,
    ModelCapabilities,
    ModelInfo,
    ModelPolicy,
    PermissionHandler,
    PermissionRequest,
    PermissionRequestResult,
    ResumeSessionConfig,
    SessionConfig,
    SessionEvent,
    SessionEventHandler,
    SessionEventPayload,
    SessionEventType,
    SessionLifecycleEvent,
    SessionLifecycleEventType,
    SessionLifecycleHandler,
    SessionMetadata,
    SystemMessageAppendConfig,
    SystemMessageConfig,
    SystemMessageReplaceConfig,
    Tool,
    ToolHandler,
    ToolInvocation,
    ToolResultObject,
    TypedSessionEventHandler,
    TypedSessionLifecycleHandler,
    ZodSchema,
} from "./types.js";
