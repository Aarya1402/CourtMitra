import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import Button from "../components/shared/Button";

describe("Button", () => {
  // ✅ 1. Default render
  test("renders with default props", () => {
    render(<Button>Click Me</Button>);

    const btn = screen.getByRole("button");
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent("Click Me");
  });

  // ✅ 2. Applies primary variant by default
  test("applies default primary variant", () => {
    render(<Button>Test</Button>);

    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/buttonPrimary/);
  });

  // ✅ 3. Applies outline variant
  test("applies outline variant", () => {
    render(<Button variant="outline">Test</Button>);

    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/buttonOutline/);
  });

  // ✅ 4. Applies danger variant
  test("applies danger variant", () => {
    render(<Button variant="danger">Test</Button>);

    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/buttonDanger/);
  });

  // ✅ 5. Applies ghost variant
  test("applies ghost variant", () => {
    render(<Button variant="ghost">Test</Button>);

    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/buttonGhost/);
  });

  // ✅ 6. Applies default size md
  test("applies default size md", () => {
    render(<Button>Test</Button>);

    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/md/);
  });

  // ✅ 7. Applies sm size
  test("applies small size", () => {
    render(<Button size="sm">Test</Button>);

    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/sm/);
  });

  // ✅ 8. Applies lg size
  test("applies large size", () => {
    render(<Button size="lg">Test</Button>);

    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/lg/);
  });

  // ✅ 9. Renders icon
  test("renders icon when provided", () => {
    render(<Button icon={<span data-testid="icon">🔥</span>}>Test</Button>);

    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  // ✅ 10. Does not render icon when not provided
  test("does not render icon when not provided", () => {
    render(<Button>Test</Button>);

    expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
  });

  // ✅ 11. Handles click
  test("handles click event", () => {
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Click</Button>);

    fireEvent.click(screen.getByRole("button"));

    expect(handleClick).toHaveBeenCalled();
  });

  // ✅ 12. Applies custom className
  test("applies custom className", () => {
    render(<Button className="custom-class">Test</Button>);

    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/custom-class/);
  });

  // ✅ 13. Passes additional props
  test("passes additional props", () => {
    render(
      <Button disabled data-testid="btn">
        Test
      </Button>
    );

    const btn = screen.getByTestId("btn");
    expect(btn).toBeDisabled();
  });
});
