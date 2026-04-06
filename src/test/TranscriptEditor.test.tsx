import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, vi, beforeEach } from "vitest";
import TranscriptEditor from "../components/TranscriptEditor/TranscriptEditor";

// 🔥 Mock icons
vi.mock("lucide-react", () => ({
  Download: () => <div>DownloadIcon</div>,
  Copy: () => <div>CopyIcon</div>,
  Check: () => <div>CheckIcon</div>,
  Trash2: () => <div>TrashIcon</div>,
  Mic: () => <div>MicIcon</div>,
  Square: () => <div>SquareIcon</div>,
}));

// 🔥 Mock Button
vi.mock("../components/shared/Button", () => ({
  default: ({ onClick, icon }: any) => (
    <button onClick={onClick}>{icon}</button>
  ),
}));

// 🔥 Mock Alert Context
const mockConfirm = vi.fn();
vi.mock("../context/AlertContext", () => ({
  useAlert: () => ({
    showConfirm: mockConfirm,
  }),
}));

// 🔥 Mock Transcriber
const mockStart = vi.fn();
const mockStop = vi.fn();

let mockTranscriberState: any = {};

vi.mock("../hooks/useTranscriber", () => ({
  useTranscriber: () => mockTranscriberState,
}));

// 🔥 Mock PDF
const mockToBlob = vi.fn();
vi.mock("@react-pdf/renderer", () => ({
  // ✅ Needed by TranscriptDocument
  Document: ({ children }: any) => <div>{children}</div>,
  Page: ({ children }: any) => <div>{children}</div>,
  Text: ({ children, render }: any) => {
    if (render) return <span>{render({ pageNumber: 1 })}</span>;
    return <span>{children}</span>;
  },
  View: ({ children }: any) => <div>{children}</div>,
  StyleSheet: { create: (styles: any) => styles },

  // ✅ THIS FIXES YOUR ERROR
  Font: {
    register: vi.fn(),
  },

  // ✅ Needed by TranscriptEditor
  pdf: () => ({
    toBlob: mockToBlob,
  }),
}));

// 🔥 Clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

// 🔥 URL
globalThis.URL.createObjectURL = vi.fn(() => "blob:url");
globalThis.URL.revokeObjectURL = vi.fn();

describe("TranscriptEditor", () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockTranscriberState = {
      isRecording: false,
      transcript: "",
      start: mockStart,
      stop: mockStop,
    };
  });

  const setup = (props = {}) =>
    render(
      <TranscriptEditor
        transcript="Hello world"
        onChange={onChange}
        {...props}
      />
    );

  // ✅ Render textarea
  it("renders textarea with transcript", () => {
    setup();
    expect(screen.getByDisplayValue("Hello world")).toBeInTheDocument();
  });

  // ✅ Copy transcript
  it("copies transcript", async () => {
    setup();

    fireEvent.click(screen.getByText("CopyIcon"));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Hello world");

    await waitFor(() => {
      expect(screen.getByText("CheckIcon")).toBeInTheDocument();
    });
  });

  // ✅ Download PDF
  it("downloads pdf", async () => {
    mockToBlob.mockResolvedValue(new Blob());

    setup();

    fireEvent.click(screen.getByText("DownloadIcon"));

    await waitFor(() => {
      expect(mockToBlob).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });

  // ❌ Download error
  it("handles download error", async () => {
    mockToBlob.mockRejectedValue(new Error("fail"));

    setup();

    fireEvent.click(screen.getByText("DownloadIcon"));

    await waitFor(() => {
      expect(mockToBlob).toHaveBeenCalled();
    });
  });

  // ✅ Clear transcript (confirm true)
  it("clears transcript on confirm", async () => {
    mockConfirm.mockResolvedValue(true);

    setup();

    fireEvent.click(screen.getByText("TrashIcon"));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith("");
    });
  });

  // ❌ Cancel clear
  it("does not clear transcript if confirm false", async () => {
    mockConfirm.mockResolvedValue(false);

    setup();

    fireEvent.click(screen.getByText("TrashIcon"));

    await waitFor(() => {
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // ✅ Typing updates transcript
  it("updates transcript on typing", () => {
    setup();

    const textarea = screen.getByRole("textbox");

    fireEvent.change(textarea, { target: { value: "New text" } });

    expect(onChange).toHaveBeenCalledWith("New text");
  });

  // ✅ Loading state
  it("shows loading overlay", () => {
    setup({ isLoading: true });

    expect(screen.getByText("Processing audio...")).toBeInTheDocument();
  });

  // ✅ Selection shows mic button
  it("shows floating mic on selection", async () => {
    setup();

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    textarea.selectionStart = 0;
    textarea.selectionEnd = 5;

    fireEvent.mouseUp(textarea, { clientX: 10, clientY: 10 });

    await waitFor(() => {
      expect(screen.getByText("MicIcon")).toBeInTheDocument();
    });
  });

  // 🎤 Start recording on modify click
  it("starts recording when clicking mic", async () => {
    setup();

    const textarea = screen.getByRole("textbox");

    (textarea as HTMLTextAreaElement).selectionStart = 0;
    (textarea as HTMLTextAreaElement).selectionEnd = 5;

    fireEvent.mouseUp(textarea, { clientX: 10, clientY: 10 });

    await waitFor(() => screen.getByText("MicIcon"));

    fireEvent.click(screen.getByText("MicIcon"));

    await waitFor(() => {
      expect(mockStart).toHaveBeenCalled();
    });
  });

  // ❌ No selection → no menu
  it("does not show menu if no selection", async () => {
    setup();

    const textarea = screen.getByRole("textbox");

    fireEvent.mouseUp(textarea, { clientX: 10, clientY: 10 });

    await waitFor(() => {
      expect(screen.queryByText("MicIcon")).not.toBeInTheDocument();
    });
  });

  // ❌ Prevent selection during recording
  it("does not allow selection during recording", async () => {
    mockTranscriberState.isRecording = true;

    setup();

    const textarea = screen.getByRole("textbox");

    fireEvent.mouseUp(textarea, { clientX: 10, clientY: 10 });

    await waitFor(() => {
      expect(screen.queryByText("MicIcon")).not.toBeInTheDocument();
    });
  });

  // ✅ Click outside hides menu
  it("hides menu on outside click", async () => {
    setup();

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

    textarea.selectionStart = 0;
    textarea.selectionEnd = 5;

    fireEvent.mouseUp(textarea, { clientX: 10, clientY: 10 });

    await waitFor(() => screen.getByText("MicIcon"));

    fireEvent.click(document);

    await waitFor(() => {
      expect(screen.queryByText("MicIcon")).not.toBeInTheDocument();
    });
  });
});
