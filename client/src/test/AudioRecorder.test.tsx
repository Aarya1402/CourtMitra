import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import AudioRecorder from "../components/AudioRecorder/AudioRecorder";

// --- Mocks ---

// Mock WebSocket
class MockWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((error: Event) => void) | null = null;
  send = vi.fn();
  close = vi.fn();
  readyState = 1; // OPEN
}
vi.stubGlobal('WebSocket', MockWebSocket);

// Mock MediaRecorder
class MockMediaRecorder {
  state = 'inactive';
  onstart: (() => void) | null = null;
  onstop: (() => void) | null = null;
  onpause: (() => void) | null = null;
  onresume: (() => void) | null = null;
  ondataavailable: ((e: BlobEvent) => void) | null = null;
  
  start = vi.fn(() => { this.state = 'recording'; });
  stop = vi.fn(() => { 
    this.state = 'inactive'; 
    if (this.onstop) this.onstop();
  });
  pause = vi.fn(() => { this.state = 'paused'; });
  resume = vi.fn(() => { this.state = 'recording'; });
}
vi.stubGlobal('MediaRecorder', MockMediaRecorder);

// Mock AudioContext
// Mock AudioContext
let mockAudioContextInstance: MockAudioContext | undefined;
class MockAudioContext {
  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    mockAudioContextInstance = this;
  }
  state: AudioContextState = 'suspended';
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
  createMediaStreamSource = vi.fn().mockReturnValue({
    connect: vi.fn(),
  });
  createAnalyser = vi.fn().mockReturnValue({
    fftSize: 0,
    frequencyBinCount: 128,
    getByteFrequencyData: vi.fn(),
    connect: vi.fn(),
  });
  audioWorklet = {
    addModule: vi.fn().mockResolvedValue(undefined),
  };
  destination = {};
  sampleRate = 16000;
}

vi.stubGlobal('AudioContext', MockAudioContext);
vi.stubGlobal('webkitAudioContext', MockAudioContext);

// Mock AudioWorkletNode
class MockAudioWorkletNode {
  port = {
    onmessage: null,
  };
  connect = vi.fn();
  disconnect = vi.fn();
}
vi.stubGlobal('AudioWorkletNode', MockAudioWorkletNode);

// Mock Navigator MediaDevices
const mockStream = {
  getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
};
vi.stubGlobal('navigator', {
  mediaDevices: {
    getUserMedia: vi.fn().mockResolvedValue(mockStream),
  },
});

// Mock requestAnimationFrame
vi.stubGlobal('requestAnimationFrame', vi.fn());
vi.stubGlobal('cancelAnimationFrame', vi.fn());

// Mock URL
window.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");

describe("AudioRecorder Component", () => {
  const defaultProps = {
    autoStart: false,
    setAudioURL: vi.fn(),
    language: "en-IN",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders with initial state correctly", () => {
    render(<AudioRecorder {...defaultProps} />);
    
    expect(screen.getByText("00:00")).toBeInTheDocument();
    expect(screen.getByText("● Record")).toBeInTheDocument();
    expect(screen.getByText("⏸ Pause")).toBeDisabled();
  });

  it("starts recording when Record button is clicked", async () => {
    const onRecordingStateChange = vi.fn();
    render(<AudioRecorder {...defaultProps} onRecordingStateChange={onRecordingStateChange} />);

    const recordBtn = screen.getByText("● Record");
    
    await act(async () => {
      fireEvent.click(recordBtn);
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(onRecordingStateChange).toHaveBeenCalledWith(true);
    expect(screen.getByText("■ Stop")).toBeInTheDocument();
    expect(screen.getByText("⏸ Pause")).not.toBeDisabled();
  });

  it("stops recording when Stop button is clicked", async () => {
    const onRecordingStateChange = vi.fn();
    render(<AudioRecorder {...defaultProps} onRecordingStateChange={onRecordingStateChange} />);

    // Start
    await act(async () => {
      fireEvent.click(screen.getByText("● Record"));
    });

    // Stop
    await act(async () => {
      fireEvent.click(screen.getByText("■ Stop"));
    });

    expect(onRecordingStateChange).toHaveBeenCalledWith(false);
    expect(screen.getByText("● Record")).toBeInTheDocument();
  });

  it("toggles pause and resume correctly", async () => {
    render(<AudioRecorder {...defaultProps} />);

    // Start
    await act(async () => {
      fireEvent.click(screen.getByText("● Record"));
    });

    const pauseBtn = screen.getByText("⏸ Pause");
    
    // Pause
    await act(async () => {
      fireEvent.click(pauseBtn);
    });
    expect(screen.getByText("▶ Resume")).toBeInTheDocument();

    // Resume
    await act(async () => {
      fireEvent.click(screen.getByText("▶ Resume"));
    });
    expect(screen.getByText("⏸ Pause")).toBeInTheDocument();
  });

  it("updates duration while recording", async () => {
    render(<AudioRecorder {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByText("● Record"));
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText("00:02")).toBeInTheDocument();
  });

  it("handles autoStart correctly", async () => {
    // Switch to real timers for this specific test as waitFor often fails with fake ones
    vi.useRealTimers();
    
    render(<AudioRecorder {...defaultProps} autoStart={true} />);

    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    }, { timeout: 2000 });
    
    // Switch back to fake timers if needed (beforeEach will handle it for the next test)
  });

  it("cleans up resources on unmount", async () => {
    const { unmount } = render(<AudioRecorder {...defaultProps} />);
    
    // Start to create resources
    await act(async () => {
      fireEvent.click(screen.getByText("● Record"));
    });

    unmount();

    expect(mockAudioContextInstance!.close).toHaveBeenCalled();
    expect(mockStream.getTracks()[0].stop).toHaveBeenCalled();
  });
});
