import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import Modal from "../components/shared/Modal";

// 🔥 mock lucide icon (optional but safe)
vi.mock("lucide-react", () => ({
  X: () => <svg data-testid="close-icon" />,
}));

describe("Modal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: "Test Modal",
  };

  // ✅ 1. Does not render when closed
  test("does not render when isOpen is false", () => {
    render(
      <Modal {...defaultProps} isOpen={false}>
        Content
      </Modal>
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // ✅ 2. Renders modal when open
  test("renders modal when open", () => {
    render(<Modal {...defaultProps}>Content</Modal>);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Test Modal")).toBeInTheDocument();
  });

  // ✅ 3. Renders children
  test("renders children content", () => {
    render(<Modal {...defaultProps}>Hello World</Modal>);

    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  // ✅ 4. Renders footer if provided
  test("renders footer when provided", () => {
    render(
      <Modal {...defaultProps} footer={<button>Footer Btn</button>}>
        Content
      </Modal>
    );

    expect(screen.getByText("Footer Btn")).toBeInTheDocument();
  });

  // ✅ 5. Does not render footer if not provided
  test("does not render footer when not provided", () => {
    render(<Modal {...defaultProps}>Content</Modal>);

    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });

  // ✅ 6. Calls onClose when backdrop clicked
  test("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();

    render(
      <Modal {...defaultProps} onClose={onClose}>
        Content
      </Modal>
    );

    fireEvent.click(screen.getByLabelText(/close modal/i));

    expect(onClose).toHaveBeenCalled();
  });

  // ✅ 7. Calls onClose when close button clicked
  test("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();

    render(
      <Modal {...defaultProps} onClose={onClose}>
        Content
      </Modal>
    );

    const closeButtons = screen.getAllByLabelText(/close/i);
    fireEvent.click(closeButtons[1]); // second button = header close

    expect(onClose).toHaveBeenCalled();
  });

  // ✅ 8. Applies default size md
  test("applies default size md", () => {
    render(<Modal {...defaultProps}>Content</Modal>);

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toMatch(/md/);
  });

  // ✅ 9. Applies sm size
  test("applies small size", () => {
    render(
      <Modal {...defaultProps} size="sm">
        Content
      </Modal>
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toMatch(/sm/);
  });

  // ✅ 10. Applies lg size
  test("applies large size", () => {
    render(
      <Modal {...defaultProps} size="lg">
        Content
      </Modal>
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toMatch(/lg/);
  });

  // ✅ 11. Accessibility: aria-labelledby
  test("has proper aria attributes", () => {
    render(<Modal {...defaultProps}>Content</Modal>);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-labelledby", "modal-title");
  });

  // ✅ 12. Title is linked correctly
  test("title is associated with dialog", () => {
    render(<Modal {...defaultProps}>Content</Modal>);

    const title = screen.getByText("Test Modal");
    expect(title).toHaveAttribute("id", "modal-title");
  });
});
