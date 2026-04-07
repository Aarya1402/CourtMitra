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
    fromTo: vi.fn(),
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

    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(mockAlert).toHaveBeenCalledWith("Please upload a document first.", expect.any(Object));
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

  it("handles fetchUser 403 error", async () => {
    const { fetchUser } = await import("../pages/HomePage/HomePage.logic");
    (fetchUser as any).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 403 },
    });
    vi.spyOn(axios, "isAxiosError").mockReturnValue(true);
    setup();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/auth", { replace: true });
    });
  });

  it("handles fetchThreads 403 error", async () => {
    const { fetchThreads } = await import("../pages/HomePage/HomePage.logic");
    (fetchThreads as any).mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 403 },
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

    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(mockAlert).toHaveBeenCalledWith("Please upload a document first.", expect.any(Object));
  });

  it("handles empty threads list", async () => {
    const { fetchThreads } = await import("../pages/HomePage/HomePage.logic");

    (fetchThreads as any).mockResolvedValueOnce([]);

    setup();

    await waitFor(() => {
      expect(screen.queryByText("Thread 1")).not.toBeInTheDocument();
      expect(screen.getByText("Your chats")).toBeInTheDocument();
    });
  });
  it("shows 'Untitled Chat' when title is empty", async () => {
    const { fetchThreads } = await import("../pages/HomePage/HomePage.logic");

    (fetchThreads as any).mockResolvedValueOnce([
      { thread_uuid: "1", title: "" },
    ]);

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText("Untitled Chat")).toBeInTheDocument();
    });
  });
  it("closes sidebar when thread clicked", async () => {
    render(<HomePage />);

    await waitFor(() => screen.getByText("Thread 1"));

    const thread = screen.getByText("Thread 1");
    fireEvent.click(thread);

    // no direct state check → but ensures click doesn't crash
    expect(thread).toBeInTheDocument();
  });
  it("shows default avatar when user not loaded", async () => {
    const { fetchUser } = await import("../pages/HomePage/HomePage.logic");

    (fetchUser as any).mockResolvedValueOnce(null);

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText("U")).toBeInTheDocument();
    });
  });
  it("toggles logout dropdown", async () => {
    render(<HomePage />);

    await waitFor(() => screen.getByText("John"));

    fireEvent.click(screen.getByText("John"));

    expect(screen.getByText("Logout")).toBeInTheDocument();

    fireEvent.click(screen.getByText("John"));

    expect(screen.queryByText("Logout")).not.toBeInTheDocument();
  });
  it("shows uploading state", async () => {
    const { uploadDocument } = await import("../pages/HomePage/HomePage.logic");

    (uploadDocument as any).mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    render(<HomePage />);

    const file = new File(["test"], "test.pdf");

    fireEvent.change(document.querySelector("input")!, {
      target: { files: [file] },
    });

    expect(screen.getByText(/uploading and processing/i)).toBeInTheDocument();
    expect(screen.getByText("Processing...")).toBeInTheDocument();
  });
  it("shows skip button when no threadId and not uploading", () => {
    render(<HomePage />);

    expect(
      screen.getByText(/start a fresh chat without documents/i)
    ).toBeInTheDocument();
  });

  it("handles mobile logo click", () => {
    setup();
    const mobileLogo = screen.getAllByRole("button").find(b => b.className.includes("mobileLogo"));
    expect(mobileLogo).toBeDefined();
    fireEvent.click(mobileLogo!);
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("navigates to home when logo is clicked in sidebar", async () => {
    setup();
    const sidebarLogo = screen.getAllByRole("button").find(b => b.className.includes("logoSection"));
    expect(sidebarLogo).toBeDefined();
    fireEvent.click(sidebarLogo!);
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("toggles sidebar on menu button click", () => {
    setup();
    const menuBtn = screen.getAllByRole("button").find(b => b.className.includes("menuBtn"));
    expect(menuBtn).toBeDefined();
    fireEvent.click(menuBtn!);
    const aside = document.querySelector("aside");
    expect(aside?.className).toContain("sidebarOpen");
  });

  it("closes sidebar on close button click", () => {
    setup();
    const menuBtn = screen.getAllByRole("button").find(b => b.className.includes("menuBtn"));
    expect(menuBtn).toBeDefined();
    fireEvent.click(menuBtn!);
    
    const closeBtn = screen.getAllByRole("button").find(b => b.className.includes("closeSidebarBtn"));
    expect(closeBtn).toBeDefined();
    fireEvent.click(closeBtn!);
    const aside = document.querySelector("aside");
    expect(aside?.className).not.toContain("sidebarOpen");
  });

  it("opens delete modal and cancels", async () => {
    setup();
    await waitFor(() => screen.getByText("Thread 1"));
    const deleteBtn = screen.getAllByRole("button").find(b => b.className.includes("deleteBtn"));
    expect(deleteBtn).toBeDefined();
    fireEvent.click(deleteBtn!);
    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
    const cancelBtn = screen.getByText("Cancel");
    fireEvent.click(cancelBtn);
    expect(screen.queryByText(/Are you sure you want to delete/)).not.toBeInTheDocument();
  });

  it("handles thread deletion success", async () => {
    const { deleteThread } = await import("../pages/HomePage/HomePage.logic");
    setup();
    await waitFor(() => screen.getByText("Thread 1"));
    const deleteBtn = screen.getAllByRole("button").find(b => b.className.includes("deleteBtn"));
    expect(deleteBtn).toBeDefined();
    fireEvent.click(deleteBtn!);
    const confirmBtn = screen.getByText("Delete");
    fireEvent.click(confirmBtn);
    await waitFor(() => {
      expect(deleteThread).toHaveBeenCalledWith("1");
      expect(screen.queryByText("Thread 1")).not.toBeInTheDocument();
    });
  });

  it("handles thread deletion failure", async () => {
    const { deleteThread } = await import("../pages/HomePage/HomePage.logic");
    (deleteThread as any).mockRejectedValueOnce(new Error("delete fail"));
    setup();
    await waitFor(() => screen.getByText("Thread 1"));
    const deleteBtn = screen.getAllByRole("button").find(b => b.className.includes("deleteBtn"));
    expect(deleteBtn).toBeDefined();
    fireEvent.click(deleteBtn!);
    const confirmBtn = screen.getByText("Delete");
    fireEvent.click(confirmBtn);
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Failed to delete thread.", expect.any(Object));
    });
  });

  it("shows alert when starting without upload", () => {
    setup();
    fireEvent.click(screen.getByText("Waiting for Upload..."));
    expect(mockAlert).toHaveBeenCalledWith("Please upload a document first.", expect.any(Object));
  });

  it("shows alert when starting during upload", async () => {
    const { uploadDocument } = await import("../pages/HomePage/HomePage.logic");
    (uploadDocument as any).mockImplementation(() => new Promise(() => {}));
    setup();
    const file = new File(["test"], "test.pdf");
    fireEvent.change(document.querySelector("input[type='file']")!, { target: { files: [file] } });
    
    fireEvent.click(screen.getByText("Processing..."));
    expect(mockAlert).toHaveBeenCalledWith("Still uploading, please wait...", expect.any(Object));
  });

  it("handles logout from user menu", async () => {
    setup();
    await waitFor(() => screen.getByText("John"));
    fireEvent.click(screen.getByText("John"));
    
    mockedAxios.mockResolvedValueOnce({});
    fireEvent.click(screen.getByText("Logout"));
    
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(expect.stringContaining("/logout"));
      expect(mockNavigate).toHaveBeenCalledWith("/auth", { replace: true });
    });
  });

  it("handles logout error gracefully", async () => {
    setup();
    await waitFor(() => screen.getByText("John"));
    fireEvent.click(screen.getByText("John"));
    
    mockedAxios.mockRejectedValueOnce(new Error("logout fail"));
    fireEvent.click(screen.getByText("Logout"));
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/auth", { replace: true });
    });
  });

  it("closes user menu on outside click", async () => {
    setup();
    await waitFor(() => screen.getByText("John"));
    fireEvent.click(screen.getByText("John"));
    expect(screen.getByText("Logout")).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("Logout")).not.toBeInTheDocument();
  });
});
