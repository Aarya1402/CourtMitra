import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, vi, beforeEach } from "vitest";
import HomePage from "../pages/HomePage/HomePage";

// 🔥 Mock router
const mockNavigate = vi.fn();
vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children }: any) => <div>{children}</div>,
}));

// 🔥 Mock redux
vi.mock("react-redux", () => ({
  useSelector: () => ({ botId: "bot-123" }),
}));

// 🔥 Mock APIs
vi.mock("../pages/HomePage/HomePage.logic", () => ({
  fetchThreads: vi.fn(() =>
    Promise.resolve([{ thread_uuid: "1", title: "Thread 1" }])
  ),
  fetchUser: vi.fn(() =>
    Promise.resolve({
      name: "John",
      email: "john@test.com",
    })
  ),
  uploadDocument: vi.fn(() => Promise.resolve("thread-123")),
  deleteThread: vi.fn(() => Promise.resolve()),
  createEmptyThread: vi.fn(() => Promise.resolve("new-thread")),
}));

// 🔥 Mock alert
const mockAlert = vi.fn();
vi.mock("../context/AlertContext", () => ({
  useAlert: () => ({
    showAlert: mockAlert,
  }),
}));

import axios from "axios";

vi.mock("axios");

const mockedAxios = axios as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();

  mockedAxios
    .mockResolvedValueOnce({
      data: { bots: [] }, // 1st call → list bots
    })
    .mockResolvedValueOnce({
      data: { bot_id: "bot-999" }, // 2nd call → create bot
    });
});

// 🔥 Mock GSAP
vi.mock("gsap", () => ({
  default: {
    timeline: () => ({
      fromTo: () => ({
        fromTo: () => ({
          fromTo: () => ({
            fromTo: () => ({
              fromTo: () => {},
            }),
          }),
        }),
      }),
    }),
  },
}));

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setup = () => render(<HomePage />);

  // ✅ Render basic UI
  it("renders homepage", async () => {
    setup();

    expect(
      screen.getByText("Hey, Let's talk to your case papers...")
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Thread 1")).toBeInTheDocument();
    });
  });

  // ✅ Upload click triggers file input
  it("triggers file input on upload click", () => {
    setup();

    const uploadBtn = screen.getByText(
      "Upload your documents to get started..."
    );

    expect(uploadBtn).toBeInTheDocument();

    fireEvent.click(uploadBtn);
  });

  it("disables get started button when no file uploaded", () => {
    setup();

    const btn = screen.getByText("Waiting for Upload...");

    expect(btn).toBeDisabled();
  });

  // ✅ File upload success
  it("handles file upload", async () => {
    setup();

    const file = new File(["test"], "test.pdf", { type: "application/pdf" });

    const input = document.querySelector("input[type='file']")!;

    fireEvent.change(input, {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByText(/File:/)).toBeInTheDocument();
    });
  });

  // ✅ Navigate after upload
  it("navigates when threadId exists", async () => {
    setup();

    const file = new File(["test"], "test.pdf", { type: "application/pdf" });

    const input = document.querySelector("input[type='file']")!;

    fireEvent.change(input, {
      target: { files: [file] },
    });

    await waitFor(() => {
      fireEvent.click(screen.getByText("Get Started"));
    });

    expect(mockNavigate).toHaveBeenCalled();
  });

  // ✅ Create new chat
  it("creates new chat", async () => {
    setup();

    fireEvent.click(
      screen.getByText("Or start a fresh chat without documents")
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  // ❌ Create chat failure
  it("handles create chat error", async () => {
    const { createEmptyThread } =
      await import("../pages/HomePage/HomePage.logic");

    (createEmptyThread as any).mockRejectedValueOnce(new Error("fail"));

    setup();

    fireEvent.click(
      screen.getByText("Or start a fresh chat without documents")
    );

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalled();
    });
  });

  it("handle fetchThread Error", async () => {
    const { fetchThreads } = await import("../pages/HomePage/HomePage.logic");

    (fetchThreads as any).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401 },
    });

    vi.spyOn(axios, "isAxiosError").mockReturnValue(true);

    setup();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/auth", { replace: true });
    });
  });

  it("handles fetchUser error", async () => {
    const { fetchUser } = await import("../pages/HomePage/HomePage.logic");

    (fetchUser as any).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401 },
    });

    vi.spyOn(axios, "isAxiosError").mockReturnValue(true);

    setup();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/auth", { replace: true });
    });
  });

  it("handles uploadDocument error", async () => {
    const { uploadDocument } = await import("../pages/HomePage/HomePage.logic");

    (uploadDocument as any).mockRejectedValueOnce(new Error("fail"));

    setup();

    const file = new File(["test"], "test.pdf", { type: "application/pdf" });
    const input = document.querySelector("input[type='file']")!;

    fireEvent.change(input, {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalled();
    });
  });

  it("disables button if no file uploaded", () => {
    setup();

    const btn = screen.getByText("Waiting for Upload...");

    expect(btn).toBeDisabled();
  });

  it("handles empty threads list", async () => {
    const { fetchThreads } = await import("../pages/HomePage/HomePage.logic");

    (fetchThreads as any).mockResolvedValueOnce([]);

    setup();

    await waitFor(() => {
      expect(screen.queryByText("Thread 1")).not.toBeInTheDocument();
    });
  });
});
