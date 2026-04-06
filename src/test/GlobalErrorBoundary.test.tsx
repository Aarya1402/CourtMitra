import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import GlobalErrorBoundary from "../components/shared/GlobalErrorBoundary";

const resetErrorMock = vi.fn();

vi.mock("@sentry/react", async () => {
  const actual = await vi.importActual<any>("@sentry/react");

  return {
    ...actual,
    ErrorBoundary: ({ fallback }: any) => {
      return fallback({
        error: new Error("Test error"),
        resetError: resetErrorMock,
      });
    },
  };
});

describe("GlobalErrorBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ✅ 1. Renders fallback UI
  test("renders error fallback UI", () => {
    render(
      <GlobalErrorBoundary>
        <div>Child</div>
      </GlobalErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    expect(screen.getByText(/unexpected error/i)).toBeInTheDocument();
  });

  // ✅ 2. Shows debug info in DEV mode
  test("shows debug info in DEV mode", () => {
    // mock DEV true
    vi.stubGlobal("import", {
      meta: { env: { DEV: true } },
    } as any);

    render(
      <GlobalErrorBoundary>
        <div>Child</div>
      </GlobalErrorBoundary>
    );

    expect(screen.getByText(/test error/i)).toBeInTheDocument();
  });

  // ✅ 3. Does not show debug info in production
  test("does not show debug info in production", async () => {
    vi.resetModules();

    // simulate production
    vi.stubEnv("DEV", false);

    const { default: GlobalErrorBoundary } =
      await import("../components/shared/GlobalErrorBoundary");

    render(
      <GlobalErrorBoundary>
        <div>Child</div>
      </GlobalErrorBoundary>
    );

    expect(screen.queryByText(/test error/i)).not.toBeInTheDocument();
  });

  // ✅ 4. Calls resetError on button click
  test("calls resetError when clicking recover button", () => {
    render(
      <GlobalErrorBoundary>
        <div>Child</div>
      </GlobalErrorBoundary>
    );

    fireEvent.click(screen.getByText(/try to recover/i));

    expect(resetErrorMock).toHaveBeenCalled();
  });

  // ✅ 5. Redirects to homepage
  test("redirects to homepage on click", () => {
    delete (globalThis as any).location;
    (globalThis as any).location = { href: "" };

    render(
      <GlobalErrorBoundary>
        <div>Child</div>
      </GlobalErrorBoundary>
    );

    fireEvent.click(screen.getByText(/go to homepage/i));

    expect(globalThis.location.href).toBe("/");
  });
});
