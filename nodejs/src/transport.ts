/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import type { MessageConnection } from "vscode-jsonrpc/node.js";

/**
 * Transport interface for communicating with the Copilot runtime.
 * Abstracts the details of how messages are sent/received.
 */
export interface Transport {
    /** The underlying JSON-RPC connection, available after start() resolves */
    readonly connection: MessageConnection | null;

    /** Start the transport and establish connection */
    start(): Promise<void>;

    /** Graceful shutdown */
    stop(): Promise<Error[]>;

    /** Forceful shutdown without cleanup */
    forceStop(): Promise<void>;
}
