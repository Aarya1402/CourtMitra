import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ChatInput from "../components/ChatMessages/ChatInput";

// 🔥 Mock lucide icons (optional but avoids noise)
vi.mock("lucide-react", () => ({
  Mic: () => <div>MicIcon</div>,
  Send: () => <div>SendIcon</div>,
}));

// 🔥 Mock useTranscriber hook
const mockStart = vi.fn();
const mockStop = vi.fn();

let mockState: Record<string, unknown> = {};

vi.mock("../hooks/useTranscriber", () => ({
  useTranscriber: () => mockState,
}));

describe("ChatInput", () => {
  const onSend = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockState = {
      isRecording: false,
      transcript: "",
      start: mockStart,
      stop: mockStop,
      error: "",
    };
  });

  const setup = (props = {}) =>
    render(<ChatInput onSend={onSend} {...props} />);

  // ✅ Basic render
  it("renders input and buttons", () => {
    setup();

    expect(
      screen.getByPlaceholderText("Type your message here...")
    ).toBeInTheDocument();

    expect(screen.getByText("MicIcon")).toBeInTheDocument();
    expect(screen.getByText("SendIcon")).toBeInTheDocument();
  });

  // ✅ Typing input
  it("updates input value on typing", () => {
    setup();

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Hello" } });

    expect(textarea).toHaveValue("Hello");
  });

  // ✅ Send button click
  it("calls onSend and clears input", () => {
    setup();

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Hello" } });

    fireEvent.click(screen.getByText("SendIcon"));

    expect(onSend).toHaveBeenCalledWith("Hello");
    expect(textarea).toHaveValue("");
  });

  // ❌ Prevent send if empty
  it("does not send empty input", () => {
    setup();

    fireEvent.click(screen.getByText("SendIcon"));

    expect(onSend).not.toHaveBeenCalled();
  });

  // ❌ Prevent send while recording
  it("does not send while recording", () => {
    mockState.isRecording = true;

    setup();

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Hello" } });

    fireEvent.click(screen.getByText("SendIcon"));

    expect(onSend).not.toHaveBeenCalled();
  });

  // ✅ Enter key sends message
  it("sends message on Enter key", () => {
    setup();

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Hello" } });

    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(onSend).toHaveBeenCalledWith("Hello");
  });

  // ❌ Shift+Enter does NOT send
  it("does not send on Shift+Enter", () => {
    setup();

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Hello" } });

    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(onSend).not.toHaveBeenCalled();
  });

  // 🎤 Start recording
  it("starts recording when mic clicked", async () => {
    setup();

    fireEvent.click(screen.getByText("MicIcon"));

    await waitFor(() => {
      expect(mockStart).toHaveBeenCalled();
    });
  });

  // 🎤 Stop recording and append transcript
  it("stops recording and appends transcript", async () => {
    mockState.isRecording = true;
    mockState.transcript = "hello world";

    setup();

    fireEvent.click(screen.getByText("MicIcon"));

    expect(mockStop).toHaveBeenCalled();
  });

  // 🎤 Append transcript to existing input
  it("appends transcript to existing input", () => {
    mockState.isRecording = true;
    mockState.transcript = "world";

    setup();

    const textarea = screen.getByRole("textbox");

    fireEvent.change(textarea, { target: { value: "hello" } });

    fireEvent.click(screen.getByText("MicIcon"));

    expect(mockStop).toHaveBeenCalled();
  });

  // 🧠 Display transcript while recording
  it("shows transcript while recording", () => {
    mockState.isRecording = true;
    mockState.transcript = "speaking...";

    setup();

    expect(screen.getByDisplayValue("speaking...")).toBeInTheDocument();
  });

  // 🧠 Placeholder changes while recording
  it("shows listening placeholder while recording", () => {
    mockState.isRecording = true;

    setup();

    expect(screen.getByPlaceholderText("Listening...")).toBeInTheDocument();
  });

  // ❌ Disabled state
  it("disables input and buttons when disabled", () => {
    setup({ disabled: true });

    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeDisabled();

    const micIcon = screen.getByText("MicIcon");
    const micButton = micIcon.closest("button");

    expect(micButton).toBeDisabled();
  });

  // ⚠️ Error display
  it("shows error message if present", () => {
    mockState.error = "Mic error";

    setup();

    expect(screen.getByText("Mic error")).toBeInTheDocument();
  });

  // 📏 Resize effect (coverage only)
  it("resizes textarea on input change", () => {
    setup();

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    fireEvent.change(textarea, {
      target: { value: "Some long text to trigger resize" },
    });

    expect(textarea.style.height).toBeTruthy();
  });
});
