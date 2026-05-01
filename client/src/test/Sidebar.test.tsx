import { render, screen } from "@testing-library/react";
import { describe, it, vi } from "vitest";
import Sidebar from "../components/Sidebar/Sidebar";

// 🔥 Mock lucide icons
vi.mock("lucide-react", () => ({
  LayoutGrid: () => <div>LayoutGridIcon</div>,
  MessageSquare: () => <div>MessageSquareIcon</div>,
  FileText: () => <div>FileTextIcon</div>,
  Database: () => <div>DatabaseIcon</div>,
  Plus: () => <div>PlusIcon</div>,
}));

describe("Sidebar", () => {
  // ✅ Render sidebar
  it("renders sidebar with menu items", () => {
    render(<Sidebar />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Chats")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("Archives")).toBeInTheDocument();
  });

  // ✅ New Chat button
  it("renders New Chat button", () => {
    render(<Sidebar />);

    expect(screen.getByText("New Chat")).toBeInTheDocument();
    expect(screen.getByText("PlusIcon")).toBeInTheDocument();
  });

  // ✅ Icons rendered
  it("renders all icons", () => {
    render(<Sidebar />);

    expect(screen.getByText("LayoutGridIcon")).toBeInTheDocument();
    expect(screen.getByText("MessageSquareIcon")).toBeInTheDocument();
    expect(screen.getByText("FileTextIcon")).toBeInTheDocument();
    expect(screen.getByText("DatabaseIcon")).toBeInTheDocument();
  });

  // ✅ Active menu item
  it("marks Chats as active", () => {
    render(<Sidebar />);

    const chatsItem = screen.getByText("Chats").closest("div");
    expect(chatsItem).toHaveClass("active");
  });

  it("other menu items are not active", () => {
    render(<Sidebar />);

    const chats = screen.getByText("Chats").closest("div");
    const dashboard = screen.getByText("Dashboard").closest("div");
    const docs = screen.getByText("Documents").closest("div");

    // ✅ Positive assertion
    expect(chats).toHaveClass("active");

    // ❌ Negative assertions
    expect(dashboard).not.toHaveClass("active");
    expect(docs).not.toHaveClass("active");
  });

  // ✅ Structure check
  it("renders correct number of menu items", () => {
    render(<Sidebar />);

    const items = screen.getAllByText(/Dashboard|Chats|Documents|Archives/);

    expect(items).toHaveLength(4);
  });

  // ✅ Style tag exists (coverage)
  it("includes style block", () => {
    render(<Sidebar />);

    const styleTag = document.querySelector("style");
    expect(styleTag).toBeInTheDocument();
  });
});
