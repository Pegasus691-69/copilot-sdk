/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

/**
 * FileSystem provider interface for the Copilot SDK.
 * Allows integrators to provide custom filesystem implementations
 * (e.g., in-memory for WASM/testing, or proxied to host).
 */
export interface FileSystemProvider {
    readFile(path: string): Promise<string>;
    writeFile(path: string, content: string): Promise<void>;
    exists(path: string): Promise<boolean>;
    readDir(path: string): Promise<string[]>;
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
    remove(path: string): Promise<void>;
}

/**
 * In-memory filesystem implementation for WASM, testing, and sandboxed scenarios.
 * Files are stored in a Map, no disk I/O.
 *
 * @example
 * ```typescript
 * const fs = new InMemoryFileSystem();
 * await fs.writeFile("/doc.txt", "Hello world");
 * const content = await fs.readFile("/doc.txt");
 * ```
 */
export class InMemoryFileSystem implements FileSystemProvider {
    private files: Map<string, string> = new Map();

    constructor(initialFiles?: Record<string, string>) {
        if (initialFiles) {
            for (const [path, content] of Object.entries(initialFiles)) {
                this.files.set(this.normalize(path), content);
            }
        }
    }

    private normalize(path: string): string {
        // Normalize path separators and remove trailing slashes
        return path.replace(/\\/g, "/").replace(/\/+$/, "") || "/";
    }

    async readFile(path: string): Promise<string> {
        const normalized = this.normalize(path);
        const content = this.files.get(normalized);
        if (content === undefined) {
            throw new Error(`ENOENT: no such file: ${normalized}`);
        }
        return content;
    }

    async writeFile(path: string, content: string): Promise<void> {
        this.files.set(this.normalize(path), content);
    }

    async exists(path: string): Promise<boolean> {
        const normalized = this.normalize(path);
        // Check exact match or any file under this directory
        if (this.files.has(normalized)) return true;
        const prefix = normalized.endsWith("/") ? normalized : normalized + "/";
        for (const key of this.files.keys()) {
            if (key.startsWith(prefix)) return true;
        }
        return false;
    }

    async readDir(path: string): Promise<string[]> {
        const normalized = this.normalize(path);
        const prefix = normalized === "/" ? "/" : normalized + "/";
        const entries = new Set<string>();
        for (const key of this.files.keys()) {
            if (key.startsWith(prefix)) {
                const relative = key.slice(prefix.length);
                const firstSegment = relative.split("/")[0];
                if (firstSegment) entries.add(firstSegment);
            }
        }
        return [...entries].sort();
    }

    async mkdir(_path: string, _options?: { recursive?: boolean }): Promise<void> {
        // No-op for in-memory FS — directories are implicit
    }

    async remove(path: string): Promise<void> {
        const normalized = this.normalize(path);
        this.files.delete(normalized);
        // Also remove any files under this directory
        const prefix = normalized + "/";
        for (const key of this.files.keys()) {
            if (key.startsWith(prefix)) {
                this.files.delete(key);
            }
        }
    }

    /** Get all files (for testing/debugging) */
    getAllFiles(): Record<string, string> {
        const result: Record<string, string> = {};
        for (const [path, content] of this.files) {
            result[path] = content;
        }
        return result;
    }

    /** Synchronous write for initialization */
    writeSync(path: string, content: string): void {
        this.files.set(this.normalize(path), content);
    }
}
