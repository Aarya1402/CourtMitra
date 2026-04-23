import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ThreadPage from "../pages/ThreadPage/ThreadPage";
import axios from "axios";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import * as reactRedux from "react-redux";
import * as storageUtils from "../utils/storageUtils";
import * as ThreadPageLogic from "../pages/ThreadPage/ThreadPage.logic";
import { initialOrderData } from "../components/OrderForm/OrderForm.logic";

// Mock axios
vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    isAxiosError: vi.fn((err: any) => err && err.isAxiosError === true),
  },
}));

// Mock Redux
vi.mock("react-redux", () => ({
  useSelector: vi.fn(),
  useDispatch: vi.fn(),
}));

// Mock Alert
const mockShowAlert = vi.fn();
vi.mock("../context/AlertContext", () => ({
  useAlert: () => ({
    showAlert: mockShowAlert,
    showConfirm: vi.fn(),
  }),
}));

// Mock Storage
vi.mock("../utils/storageUtils", () => ({
  saveThreadState: vi.fn(),
  loadThreadState: vi.fn().mockResolvedValue({}),
}));

// Mock Logic
vi.mock("../pages/HomePage/HomePage.logic", () => ({
  isLoggedIn: vi.fn().mockResolvedValue(true),
}));

vi.mock("../pages/ThreadPage/ThreadPage.logic", () => ({
  updateThreadTitle: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock child components that might be too complex or cause issues
vi.mock("../../components/AudioRecorder/AudioRecorder", () => ({
  default: () => <div data-testid="mock-audio-recorder">Audio Recorder</div>,
}));

// Mock lamejs for MP3 download test
const mockMp3Encoder = vi.fn().mockImplementation(() => ({
  encodeBuffer: vi.fn().mockReturnValue(new Int8Array()),
  flush: vi.fn().mockReturnValue(new Int8Array()),
}));

(globalThis as any).lamejs = {
  Mp3Encoder: mockMp3Encoder,
};

describe("ThreadPage Component", () => {
  const dispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (reactRedux.useDispatch as any).mockReturnValue(dispatch);
    (reactRedux.useSelector as any).mockImplementation((selector: any) => {
      return selector({
        bot: {
          languageByThread: { "test-thread": "en-IN" },
          botId: "test-bot",
        },
        chat: {
          messages: [
            { id: "1", text: "Hello", sender: "user", threadId: "test-thread" },
            {
              id: "2",
              text: "How can I help you?",
              sender: "bot",
              threadId: "test-thread",
            },
          ],
          loading: false,
        },
      });
    });

    // Mock URL methods
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    globalThis.URL.revokeObjectURL = vi.fn();

    // Mock AudioContext for MP3 download
    (globalThis as any).AudioContext = vi.fn().mockImplementation(() => ({
      decodeAudioData: vi.fn().mockResolvedValue({
        getChannelData: vi.fn().mockReturnValue(new Float32Array(100)),
        sampleRate: 44100,
      }),
    }));

    // Default axios mocks
    (axios.get as any).mockImplementation((url: string) => {
      if (url.includes("/bots/thread/")) {
        return Promise.resolve({ data: { title: "Default Title" } });
      }
      if (url.includes("/chat_history")) {
        return Promise.resolve({ data: { history: [] } });
      }
      return Promise.resolve({ data: {} });
    });

    (axios.post as any).mockResolvedValue({ data: {} });
    (axios.delete as any).mockResolvedValue({ data: { success: true } });
  });

  const renderThreadPage = (threadId = "test-thread") => {
    return render(
      <MemoryRouter initialEntries={[`/thread/${threadId}`]}>
        <Routes>
          <Route path="/thread/:threadId" element={<ThreadPage />} />
          <Route path="/auth" element={<div>Auth Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it("renders the thread page with documents and chat area", async () => {
    (axios.get as any).mockImplementation((url: string) => {
      if (url.includes("/bots/thread/")) {
        return Promise.resolve({ data: { title: "Test Case Title" } });
      }
      return Promise.resolve({ data: { history: [] } });
    });

    renderThreadPage();

    await waitFor(
      () => {
        expect(screen.getByText("Test Case Title")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(screen.getByText("Transcript")).toBeInTheDocument();
    expect(screen.getByText("Order")).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.getByText("Files")).toBeInTheDocument();
  });

  it("switches between Transcript and Order tabs", async () => {
    renderThreadPage();

    const orderTabBtn = screen.getByText("Order");
    fireEvent.click(orderTabBtn);

    await waitFor(() => {
      expect(screen.getByText("Court Order")).toBeInTheDocument();
    });

    const transcriptTabBtn = screen.getByText("Transcript");
    fireEvent.click(transcriptTabBtn);

    await waitFor(() => {
      expect(screen.getByTitle("Copy Transcript")).toBeInTheDocument();
    });
  });

  it("switches between Chat and Files tabs", async () => {
    renderThreadPage();

    const filesTabBtn = screen.getByText("Files");
    fireEvent.click(filesTabBtn);

    await waitFor(() => {
      expect(screen.getByLabelText("Refresh files")).toBeInTheDocument();
    });

    const chatTabBtn = screen.getByText("Chat");
    fireEvent.click(chatTabBtn);
    expect(
      screen.getByPlaceholderText("Type your message here...")
    ).toBeInTheDocument();
  });

  it("handles thread title editing", async () => {
    (axios.get as any).mockImplementation((url: string) => {
      if (url.includes("/bots/thread/")) {
        return Promise.resolve({ data: { title: "Original Title" } });
      }
      return Promise.resolve({ data: { history: [] } });
    });

    renderThreadPage();

    await waitFor(() => {
      expect(screen.getByText("Original Title")).toBeInTheDocument();
    });

    const titleText = screen.getByText("Original Title");
    fireEvent.click(titleText);

    const titleInput = screen.getByDisplayValue("Original Title");
    fireEvent.change(titleInput, { target: { value: "New Title" } });
    fireEvent.keyDown(titleInput, { key: "Enter" });

    await waitFor(() => {
      expect(ThreadPageLogic.updateThreadTitle).toHaveBeenCalledWith(
        "test-thread",
        "New Title"
      );
    });
  });

  it("shows user menu and handles logout", async () => {
    renderThreadPage();

    const userBtn = screen.getByLabelText("User Profile");
    fireEvent.click(userBtn);

    const logoutBtn = await screen.findByText("Logout");
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("logout")
      );
    });
  });

  it("sends a message and handles streaming response", async () => {
    (axios.post as any).mockImplementation(
      (url: string, _data: any, config: any) => {
        if (url.includes("/interact/")) {
          if (config.onDownloadProgress) {
            const fakeEvent = {
              event: {
                target: {
                  responseText:
                    'data: {"type": "TEXT_MESSAGE_CONTENT", "delta": "Hello from bot"}\n',
                },
              },
            };
            config.onDownloadProgress(fakeEvent);
          }
          return Promise.resolve({ data: {} });
        }
        return Promise.resolve({ data: {} });
      }
    );

    renderThreadPage();

    const input = screen.getByPlaceholderText("Type your message here...");
    fireEvent.change(input, { target: { value: "Hi bot" } });

    const sendBtn = screen.getByLabelText("Send Message");
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: "chat/addUserMessage" })
      );
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/interact/"),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  it("sends message and updates document IDs from file status", async () => {
    (axios.get as any).mockImplementation((url: string) => {
      if (url.includes("/file/") && url.includes("/status")) {
        return Promise.resolve({ data: { files: [{ file_id: "doc-123" }] } });
      }
      return Promise.resolve({ data: {} });
    });

    renderThreadPage();

    fireEvent.change(screen.getByPlaceholderText("Type your message here..."), {
      target: { value: "Status check" },
    });
    fireEvent.click(screen.getByLabelText("Send Message"));

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining("/status")
      );
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "document/setDocumentIds",
          payload: expect.objectContaining({ documentIds: ["doc-123"] }),
        })
      );
    });
  });

  it("can trigger MP3 download", async () => {
    (storageUtils.loadThreadState as any).mockResolvedValue({
      audioURL: "blob:mock-url",
      transcript: "test transcript",
      orderData: {},
      language: "en-IN",
    });

    renderThreadPage();

    await waitFor(() => {
      const downloadBtn = screen.queryByTitle("Save As MP3");
      expect(downloadBtn).toBeInTheDocument();
      if (downloadBtn) fireEvent.click(downloadBtn);
    });
  });

  it("handles audio file upload and transcription", async () => {
    (axios.post as any).mockImplementation((url: string) => {
      if (url === "/api/transcribe") {
        return Promise.resolve({
          data: { transcript: "Uploaded transcription result" },
        });
      }
      return Promise.resolve({ data: {} });
    });

    const { container } = renderThreadPage();

    const file = new File(["dummy audio content"], "test.mp3", {
      type: "audio/mpeg",
    });
    const hiddenInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    fireEvent.change(hiddenInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/transcribe",
        expect.any(FormData),
        expect.any(Object)
      );
      expect(
        screen.getByText("Uploaded transcription result")
      ).toBeInTheDocument();
    });
  });

  it("handles language change and translates order data", async () => {
    (axios.post as any).mockImplementation((url: string) => {
      if (url.includes("/api/order/translate")) {
        return Promise.resolve({
          data: { result: { header: { court_name: "Gujarati Court" } } },
        });
      }
      return Promise.resolve({ data: {} });
    });

    // Provide non-initial order data to trigger translate API
    (storageUtils.loadThreadState as any).mockResolvedValue({
      orderData: {
        ...initialOrderData,
        header: { court_name: "English Court" },
      },
    });

    renderThreadPage();

    // Wait for the UI to be ready
    await screen.findByText("Default Title");

    const langSelect = screen.getByRole("combobox");
    fireEvent.change(langSelect, { target: { value: "gu-IN" } });

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "bot/setLanguageForThread",
          payload: expect.objectContaining({ language: "gu-IN" }),
        })
      );
    });

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/translate"),
        expect.any(Object)
      );
    });
  });

  it("handles language change when the form is empty", async () => {
    (storageUtils.loadThreadState as any).mockResolvedValue({
      orderData: initialOrderData,
    });

    renderThreadPage();
    await screen.findByText("Default Title");

    const langSelect = screen.getByRole("combobox");
    fireEvent.change(langSelect, { target: { value: "hi-IN" } });

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "bot/setLanguageForThread",
        })
      );
      // Should NOT call translate API
      expect(axios.post).not.toHaveBeenCalledWith(
        expect.stringContaining("/translate"),
        expect.any(Object)
      );
    });
  });

  it("allows resizing divisions via drag", async () => {
    renderThreadPage();

    const resizeHandle = screen.getByTestId("resize-handle");

    // Mock globalThis.innerWidth
    const originalInnerWidth = globalThis.innerWidth;
    Object.defineProperty(globalThis, "innerWidth", {
      value: 1000,
      configurable: true,
    });

    fireEvent.mouseDown(resizeHandle);
    // Drag to 400px (40%)
    fireEvent.mouseMove(document, { clientX: 400 });
    fireEvent.mouseUp(document);

    const leftDiv = screen.getByTestId("division-left");
    expect(leftDiv.style.width).toBe("40%");

    // Restore innerWidth
    Object.defineProperty(globalThis, "innerWidth", {
      value: originalInnerWidth,
      configurable: true,
    });
  });

  it("switches tabs in mobile view", async () => {
    const originalInnerWidth = globalThis.innerWidth;
    Object.defineProperty(globalThis, "innerWidth", {
      value: 500,
      configurable: true,
    });
    window.dispatchEvent(new Event("resize"));

    renderThreadPage();

    const chatTab = await screen.findByTestId("mobile-tab-chat");
    fireEvent.click(chatTab);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Type your message here...")
      ).toBeInTheDocument();
    });

    // Restore innerWidth
    Object.defineProperty(globalThis, "innerWidth", {
      value: originalInnerWidth,
      configurable: true,
    });
  });

  it("handles data extraction from chunks", async () => {
    (axios.post as any).mockImplementation((url: string) => {
      if (url.includes("/api/order/extract")) {
        return Promise.resolve({
          data: {
            result: JSON.stringify({
              header: { court_name: "Extracted Court" },
            }),
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    (storageUtils.loadThreadState as any).mockResolvedValue({
      transcript: "Some case details to extract",
    });

    renderThreadPage();

    await waitFor(() => {
      const extractBtn = screen.getByTestId("generate-order-btn");
      expect(extractBtn).not.toBeDisabled();
      fireEvent.click(extractBtn);
    });

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/extract"),
        expect.any(Object)
      );
      // Using getByRole for tab to be safer
      expect(screen.getByRole("button", { name: "Order" })).toHaveClass(
        /activeTab/
      );
    });
  });

  it("handles delete message success and error", async () => {
    (axios.delete as any).mockResolvedValueOnce({ data: { success: true } });
    renderThreadPage();

    // 1. Open the message menu for the user message
    const menuTriggers = screen
      .getAllByRole("button")
      .filter((btn) => btn.innerHTML.includes("lucide-chevron-down"));
    fireEvent.click(menuTriggers[0]);

    // 2. Click "Delete" in the dropdown
    const dropdownDelete = await screen.findByText("Delete");
    fireEvent.click(dropdownDelete);

    // 3. Click "Delete" in the confirmation modal
    const modalDelete = await screen.findByRole("button", { name: "Delete" });
    fireEvent.click(modalDelete);

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining("/chat/1/delete")
      );
      expect(dispatch).toHaveBeenCalledWith({
        type: "chat/deleteMessage",
        payload: "1",
      });
    });

    // Error case
    console.error = vi.fn();
    (axios.delete as any).mockRejectedValueOnce(new Error("Delete failed"));

    // Open menu for the same message (it's still there because it's a mock state)
    fireEvent.click(menuTriggers[0]);
    const dropdownDeleteErr = await screen.findByText("Delete");
    fireEvent.click(dropdownDeleteErr);
    const modalDeleteErr = await screen.findByRole("button", {
      name: "Delete",
    });
    fireEvent.click(modalDeleteErr);

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining("/chat/1/delete")
      );
    });
  });

  it("handles auth failure and redirects to /auth", async () => {
    const { isLoggedIn } = await import("../pages/HomePage/HomePage.logic");
    (isLoggedIn as any).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401 },
    });

    renderThreadPage();

    await waitFor(() => {
      expect(screen.getByText("Auth Page")).toBeInTheDocument();
    });
  });

  it("handles audio upload invalid types and errors", async () => {
    renderThreadPage();

    const file = new File(["dummy content"], "test.txt", {
      type: "text/plain",
    });
    const hiddenInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    fireEvent.change(hiddenInput, { target: { files: [file] } });
    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.stringContaining("Only MP3, OGG, and WAV")
    );

    // Mock upload error
    (axios.post as any).mockRejectedValueOnce({
      isAxiosError: true,
      response: { data: { error: "Transcription Server Error" } },
    });
    const validFile = new File(["audio"], "test.mp3", { type: "audio/mpeg" });
    fireEvent.change(hiddenInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(
        screen.getByText("Transcription Server Error")
      ).toBeInTheDocument();
    });
  });

  it("closes user menu on outside click", async () => {
    renderThreadPage();
    const userBtn = screen.getByLabelText("User Profile");
    fireEvent.click(userBtn);
    expect(screen.getByText("Logout")).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(document);
    await waitFor(() => {
      expect(screen.queryByText("Logout")).not.toBeInTheDocument();
    });
  });

  it("handles send message error", async () => {
    (axios.post as any).mockRejectedValueOnce(new Error("Network Error"));
    renderThreadPage();

    const input = screen.getByPlaceholderText("Type your message here...");
    fireEvent.change(input, { target: { value: "Fail this message" } });
    fireEvent.click(screen.getByLabelText("Send Message"));

    await waitFor(() => {
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "chat/addBotMessage",
          payload: expect.objectContaining({ text: "Error getting response" }),
        })
      );
    });
  });

  it("normalizes order data with string reasoning_points and directions", async () => {
    (storageUtils.loadThreadState as any).mockResolvedValue({
      orderData: {
        reasoning_points: "Single point string",
        operative_order: { directions: "One direction string" },
      },
    });

    renderThreadPage();

    const orderTabBtn = screen.getByText("Order");
    fireEvent.click(orderTabBtn);

    // If it's normalized correctly, OrderForm should receive them as arrays.
    // We can verify this via internal component state/render if visible,
    // but here we just check if it renders without crashing and shows the strings.
    await waitFor(() => {
      expect(screen.getByText("Single point string")).toBeInTheDocument();
      expect(screen.getByText("One direction string")).toBeInTheDocument();
    });
  });
});
