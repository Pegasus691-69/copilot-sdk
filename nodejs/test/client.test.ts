/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, onTestFinished } from "vitest";
import { CopilotClient, parseCliUrl } from "../src/index.js";
import { TcpTransport } from "../src/tcp-transport.js";

// This file is for unit tests. Where relevant, prefer to add e2e tests in e2e/*.test.ts instead

describe("CopilotClient", () => {
    it("returns a standardized failure result when a tool is not registered", async () => {
        const client = new CopilotClient();
        await client.start();
        onTestFinished(() => client.forceStop());

        const session = await client.createSession();

        const response = await (
            client as unknown as { handleToolCallRequest: (typeof client)["handleToolCallRequest"] }
        ).handleToolCallRequest({
            sessionId: session.sessionId,
            toolCallId: "123",
            toolName: "missing_tool",
            arguments: {},
        });

        expect(response.result).toMatchObject({
            resultType: "failure",
            error: "tool 'missing_tool' not supported",
        });
    });

    describe("URL parsing", () => {
        it("should parse port-only URL format", () => {
            const result = parseCliUrl("8080");
            expect(result.port).toBe(8080);
            expect(result.host).toBe("localhost");
        });

        it("should parse host:port URL format", () => {
            const result = parseCliUrl("127.0.0.1:9000");
            expect(result.port).toBe(9000);
            expect(result.host).toBe("127.0.0.1");
        });

        it("should parse http://host:port URL format", () => {
            const result = parseCliUrl("http://localhost:7000");
            expect(result.port).toBe(7000);
            expect(result.host).toBe("localhost");
        });

        it("should parse https://host:port URL format", () => {
            const result = parseCliUrl("https://example.com:443");
            expect(result.port).toBe(443);
            expect(result.host).toBe("example.com");
        });

        it("should throw error for invalid URL format", () => {
            expect(() => parseCliUrl("invalid-url")).toThrow(/Invalid cliUrl format/);
        });

        it("should throw error for invalid port - too high", () => {
            expect(() => parseCliUrl("localhost:99999")).toThrow(/Invalid port in cliUrl/);
        });

        it("should throw error for invalid port - zero", () => {
            expect(() => parseCliUrl("localhost:0")).toThrow(/Invalid port in cliUrl/);
        });

        it("should throw error for invalid port - negative", () => {
            expect(() => parseCliUrl("localhost:-1")).toThrow(/Invalid port in cliUrl/);
        });

        it("should throw error when cliUrl is used with useStdio", () => {
            expect(() => {
                new CopilotClient({
                    cliUrl: "localhost:8080",
                    useStdio: true,
                    logLevel: "error",
                });
            }).toThrow(/cliUrl is mutually exclusive/);
        });

        it("should throw error when cliUrl is used with cliPath", () => {
            expect(() => {
                new CopilotClient({
                    cliUrl: "localhost:8080",
                    cliPath: "/path/to/cli",
                    logLevel: "error",
                });
            }).toThrow(/cliUrl is mutually exclusive/);
        });

        it("should set useStdio to false when cliUrl is provided", () => {
            const client = new CopilotClient({
                cliUrl: "8080",
                logLevel: "error",
            });

            expect(client["options"].useStdio).toBe(false);
        });

        it("should create TcpTransport when cliUrl is provided", () => {
            const client = new CopilotClient({
                cliUrl: "localhost:8080",
                logLevel: "error",
            });

            expect((client as any).transport).toBeInstanceOf(TcpTransport);
        });
    });

    describe("Auth options", () => {
        it("should accept githubToken option", () => {
            const client = new CopilotClient({
                githubToken: "gho_test_token",
                logLevel: "error",
            });

            expect((client as any).options.githubToken).toBe("gho_test_token");
        });

        it("should default useLoggedInUser to false (secure by default)", () => {
            const client = new CopilotClient({
                logLevel: "error",
            });

            expect((client as any).options.useLoggedInUser).toBe(false);
        });

        it("should default useLoggedInUser to false when githubToken is provided", () => {
            const client = new CopilotClient({
                githubToken: "gho_test_token",
                logLevel: "error",
            });

            expect((client as any).options.useLoggedInUser).toBe(false);
        });

        it("should allow explicit useLoggedInUser: true with githubToken", () => {
            const client = new CopilotClient({
                githubToken: "gho_test_token",
                useLoggedInUser: true,
                logLevel: "error",
            });

            expect((client as any).options.useLoggedInUser).toBe(true);
        });

        it("should allow explicit useLoggedInUser: false without githubToken", () => {
            const client = new CopilotClient({
                useLoggedInUser: false,
                logLevel: "error",
            });

            expect((client as any).options.useLoggedInUser).toBe(false);
        });

        it("should throw error when githubToken is used with cliUrl", () => {
            expect(() => {
                new CopilotClient({
                    cliUrl: "localhost:8080",
                    githubToken: "gho_test_token",
                    logLevel: "error",
                });
            }).toThrow(/githubToken and useLoggedInUser cannot be used with cliUrl/);
        });

        it("should throw error when useLoggedInUser is used with cliUrl", () => {
            expect(() => {
                new CopilotClient({
                    cliUrl: "localhost:8080",
                    useLoggedInUser: false,
                    logLevel: "error",
                });
            }).toThrow(/githubToken and useLoggedInUser cannot be used with cliUrl/);
        });
    });
});
