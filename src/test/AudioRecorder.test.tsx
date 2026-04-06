import { render, screen } from "@testing-library/react";
import { describe, it, vi, beforeEach, expect } from "vitest";
import AudioRecorder from "../components/AudioRecorder/AudioRecorder";

/* ================= MOCKS ================= */

// 🎤 MediaDevices
Object.defineProperty(globalThis.navigator, "mediaDevices", {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }),
  },
});

// 🎧 AudioContext
class MockAudioContext {
  state = "running";
  sampleRate = 16000;

  createMediaStreamSource() {
    return { connect: vi.fn() };
  }

  createAnalyser() {
    return {
      fftSize: 256,
      frequencyBinCount: 32,
      getByteFrequencyData: vi.fn(),
    };
  }

  audioWorklet = {
    addModule: vi.fn().mockResolvedValue(undefined),
  };

  createBuffer() {}
  destination = {};

  close = vi.fn();
  resume = vi.fn();
}

globalThis.AudioContext = MockAudioContext as any;

// 🌐 WebSocket
globalThis.WebSocket = vi.fn(() => ({
  send: vi.fn(),
  close: vi.fn(),
  readyState: 1,
  onopen: null,
  onmessage: null,
  onerror: null,
})) as any;

// 🎙 MediaRecorder
globalThis.MediaRecorder = class {
  ondataavailable: any;
  onstop: any;

  start = vi.fn();
  stop = vi.fn(() => this.onstop?.());
  pause = vi.fn();
  resume = vi.fn();
} as any;

/* ================= TESTS ================= */

describe("AudioRecorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setup = (props = {}) => {
    const defaultProps = {
      autoStart: false,
      setAudioURL: vi.fn(),
      language: "en",
    };

    return render(<AudioRecorder {...defaultProps} {...props} />);
  };

  it("renders initial UI", () => {
    setup();
    expect(screen.getByText("● Record")).toBeInTheDocument();
  });
});
