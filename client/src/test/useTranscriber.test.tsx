import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTranscriber } from "../hooks/useTranscriber";

/* ================= MOCKS ================= */

// ✅ crypto (UNIQUE IDs)
let idCounter = 0;
vi.stubGlobal("crypto", {
  randomUUID: () => `mock-id-${idCounter++}`,
});

// ✅ MediaDevices
const mockStream = {
  getTracks: () => [{ stop: vi.fn() }],
};

Object.defineProperty(globalThis.navigator, "mediaDevices", {
  value: {
    getUserMedia: vi.fn(() => Promise.resolve(mockStream)),
  },
});

// ✅ AudioContext
class MockAudioContext {
  sampleRate = 16000;
  resume = vi.fn(() => Promise.resolve());
  close = vi.fn();

  createMediaStreamSource = vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));

  audioWorklet = {
    addModule: vi.fn(() => Promise.resolve()),
  };

  destination = {};
}
vi.stubGlobal("AudioContext", MockAudioContext);

// ✅ AudioWorkletNode
class MockWorklet {
  port = {
    onmessage: null as any,
  };
  connect = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal("AudioWorkletNode", MockWorklet);

// ✅ WebSocket (TRACK INSTANCES)
const wsInstances: any[] = [];

class MockWebSocket {
  static readonly OPEN = 1;
  readyState = 1;

  onopen: any;
  onmessage: any;
  onerror: any;

  send = vi.fn();
  close = vi.fn();

  constructor() {
    wsInstances.push(this); // 🔥 track instance
    setTimeout(() => this.onopen && this.onopen(), 0);
  }
}
vi.stubGlobal("WebSocket", MockWebSocket);

/* ================= TESTS ================= */

describe("useTranscriber", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wsInstances.length = 0;
    idCounter = 0;
  });

  // ✅ 1. Start recording
  it("should start recording successfully", async () => {
    const { result } = renderHook(() => useTranscriber());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.isRecording).toBe(true);
    expect(result.current.error).toBe(null);
  });

  // ✅ 2. Prevent multiple recorders
  it("should block second recorder", async () => {
    const hook1 = renderHook(() => useTranscriber());
    const hook2 = renderHook(() => useTranscriber());

    await act(async () => {
      await hook1.result.current.start();
    });

    await act(async () => {
      await hook2.result.current.start();
    });

    expect(hook2.result.current.error).toBe("Another recording is in progress");
  });

  // ✅ 3. Transcript merging
  it("should update transcript from websocket", async () => {
    const { result } = renderHook(() => useTranscriber());

    await act(async () => {
      await result.current.start();
    });

    const ws = wsInstances[0]; // ✅ correct instance

    act(() => {
      ws.onmessage({
        data: JSON.stringify({
          type: "transcript",
          data: { transcript: "Hello" },
        }),
      });
    });

    expect(result.current.transcript).toBe("Hello");

    act(() => {
      ws.onmessage({
        data: JSON.stringify({
          type: "transcript",
          data: { transcript: "Hello world" },
        }),
      });
    });

    expect(result.current.transcript).toBe("Hello world");
  });

  // ✅ 4. Stop recording
  it("should stop recording and cleanup", async () => {
    const { result } = renderHook(() => useTranscriber());

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      result.current.stop();
    });

    expect(result.current.isRecording).toBe(false);
  });

  // ✅ 5. WebSocket error handling
  it("should handle websocket error", async () => {
    const { result } = renderHook(() => useTranscriber());

    await act(async () => {
      await result.current.start();
    });

    const ws = wsInstances[0];

    act(() => {
      ws.onerror();
    });

    expect(result.current.error).toBe("Connection error");
    expect(result.current.isRecording).toBe(false);
  });
});
