import { jest } from "@jest/globals";
import { EventEmitter } from "node:events";

/* ================= MOCK WS ================= */

let connectionHandler: any;

jest.unstable_mockModule("ws", () => ({
  WebSocketServer: class MockWSS extends EventEmitter {
    constructor() {
      super();
    }

    override on(event: string, cb: any) {
      if (event === "connection") {
        connectionHandler = cb;
      }
      return super.on(event, cb);
    }
  },

  WebSocket: class MockWS extends EventEmitter {
    constructor(_url?: string) {
      // ✅ FIX 1: accept arg
      super();
    }

    send = jest.fn();
    close = jest.fn();
    readyState = 1;
  },
}));

/* ================= MOCK SARVAM ================= */

let mockSarvamSocket: any;

jest.unstable_mockModule("sarvamai", () => ({
  SarvamAIClient: class MockClient {
    speechToTextStreaming = {
      connect: jest.fn().mockImplementation(() => {
        mockSarvamSocket = Object.assign(new EventEmitter(), {
          readyState: 1,
          transcribe: jest.fn(),
          flush: jest.fn(),
          close: jest.fn(),
        });
        return Promise.resolve(mockSarvamSocket);
      }),
    };
  },
}));

/* ================= TESTS ================= */

describe("WebSocket Server (index.ts)", () => {
  let ws: any;

  beforeAll(() => {
    process.env.NODE_ENV = "test";
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    await import("../index.js");

    const { WebSocket } = await import("ws");

    ws = new WebSocket("ws://localhost"); // ✅ FIX 2: pass dummy URL

    if (!connectionHandler) {
      throw new Error("connectionHandler not initialized"); // ✅ FIX 3: safety
    }

    connectionHandler(ws);
  });

  it("should initialize Sarvam on start", async () => {
    ws.emit("message", Buffer.from(JSON.stringify({ type: "start" })), false);
    await new Promise((r) => setTimeout(r, 0));

    expect(mockSarvamSocket).toBeDefined();
  });

  it("should send audio to sarvam on binary message", async () => {
    ws.emit("message", Buffer.from(JSON.stringify({ type: "start" })), false);
    await new Promise((r) => setTimeout(r, 0));

    ws.emit("message", Buffer.from("audio-data"), true);

    expect(mockSarvamSocket.transcribe).toHaveBeenCalled();
  });

  it("should flush on stop message", async () => {
    ws.emit("message", Buffer.from(JSON.stringify({ type: "start" })), false);
    await new Promise((r) => setTimeout(r, 0));

    ws.emit("message", Buffer.from(JSON.stringify({ type: "stop" })), false);

    expect(mockSarvamSocket.flush).toHaveBeenCalled();
  });

  it("should send ready on sarvam open", async () => {
    ws.emit("message", Buffer.from(JSON.stringify({ type: "start" })), false);
    await new Promise((r) => setTimeout(r, 0));

    mockSarvamSocket.emit("open");

    expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: "ready" }));
  });

  it("should forward transcript messages", async () => {
    ws.emit("message", Buffer.from(JSON.stringify({ type: "start" })), false);
    await new Promise((r) => setTimeout(r, 0));

    mockSarvamSocket.emit("message", {
      type: "data",
      data: { text: "hello" },
    });

    expect(ws.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "transcript", data: { text: "hello" } }),
    );
  });

  it("should forward sarvam error", async () => {
    ws.emit("message", Buffer.from(JSON.stringify({ type: "start" })), false);
    await new Promise((r) => setTimeout(r, 0));

    mockSarvamSocket.emit("error", new Error("fail"));

    expect(ws.send).toHaveBeenCalledWith(expect.stringContaining("Sarvam WS Error"));
  });

  it("should send closed event", async () => {
    ws.emit("message", Buffer.from(JSON.stringify({ type: "start" })), false);
    await new Promise((r) => setTimeout(r, 0));

    mockSarvamSocket.emit("close");

    expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: "closed" }));
  });

  it("should handle invalid JSON gracefully", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    ws.emit("message", Buffer.from("invalid-json"), false);

    expect(spy).toHaveBeenCalled();
  });

  it("should close sarvam socket on ws close", async () => {
    ws.emit("message", Buffer.from(JSON.stringify({ type: "start" })), false);
    await new Promise((r) => setTimeout(r, 0));

    ws.emit("close");

    expect(mockSarvamSocket.close).toHaveBeenCalled();
  });

  it("should handle unknown sarvam message type", async () => {
    ws.emit("message", Buffer.from(JSON.stringify({ type: "start" })), false);
    await new Promise((r) => setTimeout(r, 0));

    mockSarvamSocket.emit("message", {
      type: "other",
      data: { foo: "bar" },
    });

    expect(ws.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: "event",
        data: { type: "other", data: { foo: "bar" } },
      }),
    );
  });
});
