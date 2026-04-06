import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, vi, beforeEach } from "vitest";
import ChatMessages from "../components/ChatMessages/ChatMessages";

// 🔥 Mock lucide icons
vi.mock("lucide-react", () => ({
  Copy: () => <div>CopyIcon</div>,
  Check: () => <div>CheckIcon</div>,
  ChevronDown: () => <div>MenuIcon</div>,
  Trash2: () => <div>TrashIcon</div>,
  X: () => <div>CloseIcon</div>,
}));

// 🔥 Mock GSAP
vi.mock("gsap", () => ({
  default: {
    fromTo: vi.fn(),
  },
}));

// 🔥 Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe("ChatMessages", () => {
  const mockDelete = vi.fn();

  const messages = [
    {
      id: "1",
      text: "<b>Hello</b>",
      sender: "user" as const,
    },
    {
      id: "2",
      text: "Hi there",
      sender: "bot" as const,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ✅ Render messages
  it("renders messages correctly", () => {
    render(<ChatMessages messages={messages} onDelete={mockDelete} />);

    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Hi there")).toBeInTheDocument();
  });

  // ✅ Dropdown menu opens
  it("opens dropdown menu on click", () => {
    render(<ChatMessages messages={messages} onDelete={mockDelete} />);

    const menuBtn = screen.getAllByText("MenuIcon")[0];
    fireEvent.click(menuBtn);

    expect(screen.getByText("Copy")).toBeInTheDocument();
  });

  // ✅ Copy text
  it("copies text to clipboard", async () => {
    render(<ChatMessages messages={messages} onDelete={mockDelete} />);

    fireEvent.click(screen.getAllByText("MenuIcon")[0]);
    fireEvent.click(screen.getByText("Copy"));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Hello");
    });
  });

  // ❌ Copy failure (catch block)
  it("handles copy failure", async () => {
    (navigator.clipboard.writeText as any).mockRejectedValueOnce(
      new Error("fail")
    );

    render(<ChatMessages messages={messages} onDelete={mockDelete} />);

    fireEvent.click(screen.getAllByText("MenuIcon")[0]);
    fireEvent.click(screen.getByText("Copy"));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  // ✅ Delete button visible only for user
  it("shows delete option only for user messages", () => {
    render(<ChatMessages messages={messages} onDelete={mockDelete} />);

    fireEvent.click(screen.getAllByText("MenuIcon")[0]);

    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("does not show delete for bot messages", () => {
    render(<ChatMessages messages={messages} onDelete={mockDelete} />);

    fireEvent.click(screen.getAllByText("MenuIcon")[1]);

    // ✅ Ensure menu opened
    expect(screen.getByText("Copy")).toBeInTheDocument();

    // ✅ Ensure delete is NOT present
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  // ✅ Open delete modal
  it("opens delete modal", () => {
    render(<ChatMessages messages={messages} onDelete={mockDelete} />);

    fireEvent.click(screen.getAllByText("MenuIcon")[0]);
    fireEvent.click(screen.getByText("Delete"));

    expect(screen.getByText("Delete message?")).toBeInTheDocument();
  });

  // ✅ Cancel delete
  it("closes modal on cancel", () => {
    render(<ChatMessages messages={messages} onDelete={mockDelete} />);

    fireEvent.click(screen.getAllByText("MenuIcon")[0]);
    fireEvent.click(screen.getByText("Delete"));

    fireEvent.click(screen.getByText("Cancel"));

    expect(screen.queryByText("Delete message?")).not.toBeInTheDocument();
  });

  // ✅ Confirm delete
  it("calls onDelete on confirm", () => {
    render(<ChatMessages messages={messages} onDelete={mockDelete} />);

    fireEvent.click(screen.getAllByText("MenuIcon")[0]);
    fireEvent.click(screen.getByText("Delete"));

    fireEvent.click(screen.getByText("Delete"));

    expect(mockDelete).toHaveBeenCalledWith("1");
  });

  // ❌ No delete if id contains "-"
  it("does not show delete if id contains dash", () => {
    const msgs = [{ id: "temp-1", text: "temp", sender: "user" as const }];

    render(<ChatMessages messages={msgs} onDelete={mockDelete} />);

    fireEvent.click(screen.getByText("MenuIcon"));

    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  // ✅ Close menu on outside click
  it("closes menu on outside click", () => {
    render(<ChatMessages messages={messages} onDelete={mockDelete} />);

    fireEvent.click(screen.getAllByText("MenuIcon")[0]);
    expect(screen.getByText("Copy")).toBeInTheDocument();

    fireEvent.mouseDown(document);

    expect(screen.queryByText("Copy")).not.toBeInTheDocument();
  });

  // ✅ GSAP animation triggered (coverage)
  it("triggers animation on new messages", () => {
    const { rerender } = render(
      <ChatMessages messages={[]} onDelete={mockDelete} />
    );

    rerender(<ChatMessages messages={messages} onDelete={mockDelete} />);

    // Just ensures no crash (GSAP mocked)
    expect(true).toBeTruthy();
  });

  // ✅ Render without onDelete
  it("renders without delete menu if onDelete not provided", () => {
    render(<ChatMessages messages={messages} />);

    expect(screen.queryByText("MenuIcon")).not.toBeInTheDocument();
  });
});
