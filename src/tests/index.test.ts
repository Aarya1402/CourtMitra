import { jest } from "@jest/globals";
import { EventEmitter } from "node:events";

jest.unstable_mockModule("ws", () => ({
  WebSocketServer: class MockWSS extends EventEmitter {
    constructor() {
      super();
    }
  },
  WebSocket: class MockWS extends EventEmitter {
    send = jest.fn();
    close = jest.fn();
    readyState = 1;
  },
}));

jest.unstable_mockModule("sarvamai", () => ({
  SarvamAIClient: class MockClient {
    speechToTextStreaming = {
      connect: jest.fn<() => Promise<unknown>>().mockResolvedValue(Object.assign(new EventEmitter(), {
        transcribe: jest.fn(),
        flush: jest.fn(),
        close: jest.fn(),
      })),
    };
  },
}));

describe("Index / WebSocket Server Logic", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
    process.env.NODE_ENV = "test";
    process.env.PORT = "0"; // avoid port collision
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should initialize socket and export app without crashing", async () => {
    const mainModule = await import("../index.js");
    expect(mainModule).toBeDefined();
  });
});
