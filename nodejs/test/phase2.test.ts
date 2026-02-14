/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it } from "vitest";
import { CopilotClient, preset, InMemoryFileSystem, parseCliUrl } from "../src/index.js";
import { WasmConnection, WasmTransport, type WasmModule } from "../src/wasm-transport.js";

describe("Presets", () => {
    it("cli preset should enable full CLI experience", () => {
        const config = preset("cli");
        expect(config.client.useLoggedInUser).toBe(true);
        expect(config.client.autoStart).toBe(true);
        expect(config.client.autoRestart).toBe(true);
        expect(config.session.configDiscovery).toBe(true);
        expect(config.session.agentDiscovery).toBe(true);
        expect(config.session.sessionStorage).toBe("disk");
    });

    it("filesystem preset should be restricted", () => {
        const config = preset("filesystem");
        expect(config.session.configDiscovery).toBe(false);
        expect(config.session.agentDiscovery).toBe(false);
        expect(config.session.sessionStorage).toBe("memory");
    });

    it("minimal preset should be most restrictive", () => {
        const config = preset("minimal");
        expect(config.session.configDiscovery).toBe(false);
        expect(config.session.agentDiscovery).toBe(false);
        expect(config.session.sessionStorage).toBe("memory");
    });

    it("should allow overrides", () => {
        const config = preset("minimal", {
            session: { configDiscovery: true },
        });
        expect(config.session.configDiscovery).toBe(true);
    });

    it("should throw for unknown preset", () => {
        expect(() => preset("unknown" as any)).toThrow(/Unknown preset/);
    });
});

describe("InMemoryFileSystem", () => {
    it("should read and write files", async () => {
        const fs = new InMemoryFileSystem();
        await fs.writeFile("/test.txt", "hello");
        expect(await fs.readFile("/test.txt")).toBe("hello");
    });

    it("should initialize with files", async () => {
        const fs = new InMemoryFileSystem({ "/a.txt": "aaa", "/b.txt": "bbb" });
        expect(await fs.readFile("/a.txt")).toBe("aaa");
        expect(await fs.readFile("/b.txt")).toBe("bbb");
    });

    it("should throw ENOENT for missing files", async () => {
        const fs = new InMemoryFileSystem();
        await expect(fs.readFile("/missing")).rejects.toThrow("ENOENT");
    });

    it("should check file existence", async () => {
        const fs = new InMemoryFileSystem({ "/exists.txt": "yes" });
        expect(await fs.exists("/exists.txt")).toBe(true);
        expect(await fs.exists("/nope.txt")).toBe(false);
    });

    it("should check directory existence", async () => {
        const fs = new InMemoryFileSystem({ "/dir/file.txt": "content" });
        expect(await fs.exists("/dir")).toBe(true);
        expect(await fs.exists("/other")).toBe(false);
    });

    it("should read directory entries", async () => {
        const fs = new InMemoryFileSystem({
            "/dir/a.txt": "a",
            "/dir/b.txt": "b",
            "/dir/sub/c.txt": "c",
        });
        const entries = await fs.readDir("/dir");
        expect(entries).toEqual(["a.txt", "b.txt", "sub"]);
    });

    it("should remove files", async () => {
        const fs = new InMemoryFileSystem({ "/file.txt": "data" });
        await fs.remove("/file.txt");
        expect(await fs.exists("/file.txt")).toBe(false);
    });

    it("should remove directories recursively", async () => {
        const fs = new InMemoryFileSystem({
            "/dir/a.txt": "a",
            "/dir/sub/b.txt": "b",
        });
        await fs.remove("/dir");
        expect(await fs.exists("/dir")).toBe(false);
    });

    it("should normalize paths", async () => {
        const fs = new InMemoryFileSystem();
        await fs.writeFile("/path/to/file.txt", "content");
        expect(await fs.readFile("/path/to/file.txt")).toBe("content");
    });

    it("should support writeSync for initialization", () => {
        const fs = new InMemoryFileSystem();
        fs.writeSync("/init.txt", "initialized");
        expect(fs.getAllFiles()).toEqual({ "/init.txt": "initialized" });
    });

    it("mkdir should be a no-op", async () => {
        const fs = new InMemoryFileSystem();
        await fs.mkdir("/dir", { recursive: true }); // should not throw
    });
});

describe("WasmConnection", () => {
    function createMockWasmModule(): WasmModule {
        return {
            init: (async () => {}) as any,
            send_jsonrpc: async (requestJson: string) => {
                const req = JSON.parse(requestJson);
                if (req.method === "ping") {
                    return JSON.stringify({
                        jsonrpc: "2.0",
                        id: req.id,
                        result: { message: "pong", timestamp: Date.now() },
                    });
                }
                return JSON.stringify({
                    jsonrpc: "2.0",
                    id: req.id,
                    error: { code: -32601, message: "Method not found" },
                });
            },
        };
    }

    it("should send requests and parse responses", async () => {
        const conn = new WasmConnection(createMockWasmModule());
        const result = await conn.sendRequest("ping", {});
        expect(result).toHaveProperty("message", "pong");
    });

    it("should throw on error responses", async () => {
        const conn = new WasmConnection(createMockWasmModule());
        await expect(conn.sendRequest("unknown.method", {})).rejects.toThrow("Method not found");
    });

    it("should dispatch events to notification handlers", () => {
        const conn = new WasmConnection(createMockWasmModule());
        const received: unknown[] = [];
        conn.onNotification("test.event", (params) => received.push(params));

        conn._dispatchEvent("test.event", JSON.stringify({ data: "hello" }));
        expect(received).toEqual([{ data: "hello" }]);
    });

    it("should dispatch requests to request handlers", async () => {
        const conn = new WasmConnection(createMockWasmModule());
        conn.onRequest("tool.call", async (params: any) => {
            return { result: `handled ${params.toolName}` };
        });

        const response = await conn._dispatchRequest(
            "tool.call",
            JSON.stringify({ toolName: "test" }),
        );
        expect(JSON.parse(response)).toEqual({ result: "handled test" });
    });

    it("should throw after dispose", async () => {
        const conn = new WasmConnection(createMockWasmModule());
        conn.dispose();
        await expect(conn.sendRequest("ping", {})).rejects.toThrow("disposed");
    });
});

describe("WasmTransport", () => {
    it("should require wasmModule option", async () => {
        const transport = new WasmTransport({});
        await expect(transport.start()).rejects.toThrow("wasmModule is required");
    });

    it("should start with a WasmModule instance", async () => {
        const mockModule: WasmModule = {
            init: (async () => {}) as any,
            send_jsonrpc: async () => JSON.stringify({ jsonrpc: "2.0", id: 1, result: {} }),
        };

        const transport = new WasmTransport({ wasmModule: mockModule });
        await transport.start();
        expect(transport.connection).not.toBeNull();
    });

    it("should start with a WasmModule loader function", async () => {
        const mockModule: WasmModule = {
            init: (async () => {}) as any,
            send_jsonrpc: async () => JSON.stringify({ jsonrpc: "2.0", id: 1, result: {} }),
        };

        const transport = new WasmTransport({ wasmModule: () => Promise.resolve(mockModule) });
        await transport.start();
        expect(transport.connection).not.toBeNull();
    });

    it("should stop cleanly", async () => {
        const mockModule: WasmModule = {
            init: (async () => {}) as any,
            send_jsonrpc: async () => JSON.stringify({ jsonrpc: "2.0", id: 1, result: {} }),
        };

        const transport = new WasmTransport({ wasmModule: mockModule });
        await transport.start();
        const errors = await transport.stop();
        expect(errors).toEqual([]);
        expect(transport.connection).toBeNull();
    });
});

describe("Secure defaults", () => {
    it("should default useLoggedInUser to false", () => {
        const client = new CopilotClient({ logLevel: "error" });
        expect((client as any).options.useLoggedInUser).toBe(false);
    });

    it("should throw when runtime wasm is used with cliPath", () => {
        expect(
            () =>
                new CopilotClient({
                    runtime: "wasm",
                    cliPath: "/bin/cli",
                }),
        ).toThrow(/mutually exclusive/);
    });

    it("should throw when runtime wasm is used with cliUrl", () => {
        expect(
            () =>
                new CopilotClient({
                    runtime: "wasm",
                    cliUrl: "localhost:8080",
                }),
        ).toThrow(/mutually exclusive/);
    });
});

describe("parseCliUrl", () => {
    it("should parse port only", () => {
        expect(parseCliUrl("8080")).toEqual({ host: "localhost", port: 8080 });
    });

    it("should parse host:port", () => {
        expect(parseCliUrl("myhost:3000")).toEqual({ host: "myhost", port: 3000 });
    });

    it("should strip http protocol", () => {
        expect(parseCliUrl("http://myhost:3000")).toEqual({ host: "myhost", port: 3000 });
    });

    it("should strip https protocol", () => {
        expect(parseCliUrl("https://myhost:3000")).toEqual({ host: "myhost", port: 3000 });
    });
});
