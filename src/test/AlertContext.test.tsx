import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AlertProvider, useAlert } from "../context/AlertContext";

// 🔥 Mock Modal
vi.mock("../components/shared/Modal", () => ({
  default: ({ isOpen, title, children, footer }: any) =>
    isOpen ? (
      <div>
        <div>{title}</div>
        <div>{children}</div>
        <div>{footer}</div>
      </div>
    ) : null,
}));

// 🔥 Mock Button
vi.mock("../components/shared/Button", () => ({
  default: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

// 🔥 Helper component to use context
const TestComponent = () => {
  const { showAlert, showConfirm } = useAlert();

  return (
    <div>
      <button onClick={() => showAlert("Test Alert")}>Show Alert</button>
      <button onClick={() => showConfirm("Test Confirm")}>Show Confirm</button>
    </div>
  );
};

describe("AlertContext", () => {
  // ❌ Hook outside provider
  it("throws error if used outside provider", () => {
    const BrokenComponent = () => {
      useAlert();
      return null;
    };

    expect(() => render(<BrokenComponent />)).toThrow(
      "useAlert must be used within an AlertProvider"
    );
  });

  // ✅ showAlert flow
  it("shows alert and resolves on close", async () => {
    render(
      <AlertProvider>
        <TestComponent />
      </AlertProvider>
    );

    fireEvent.click(screen.getByText("Show Alert"));

    // ✅ Modal appears
    expect(screen.getByText("Alert")).toBeInTheDocument();
    expect(screen.getByText("Test Alert")).toBeInTheDocument();

    // Click OK
    fireEvent.click(screen.getByText("OK"));

    await waitFor(() => {
      expect(screen.queryByText("Test Alert")).not.toBeInTheDocument();
    });
  });

  // ✅ showConfirm confirm flow
  it("resolves true on confirm", async () => {
    let result: boolean | undefined;

    const TestConfirm = () => {
      const { showConfirm } = useAlert();

      return (
        <button
          onClick={async () => {
            result = await showConfirm("Confirm?");
          }}
        >
          Trigger
        </button>
      );
    };

    render(
      <AlertProvider>
        <TestConfirm />
      </AlertProvider>
    );

    fireEvent.click(screen.getByText("Trigger"));

    expect(screen.getByText("Confirm?")).toBeInTheDocument(); // message

    const confirmBtn = screen.getByRole("button", { name: "Confirm" });
    expect(confirmBtn).toBeInTheDocument();

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(result).toBe(true);
    });
  });

  // ❌ showConfirm cancel flow
  it("resolves false on cancel", async () => {
    let result: boolean | undefined;

    const TestConfirm = () => {
      const { showConfirm } = useAlert();

      return (
        <button
          onClick={async () => {
            result = await showConfirm("Confirm?");
          }}
        >
          Trigger
        </button>
      );
    };

    render(
      <AlertProvider>
        <TestConfirm />
      </AlertProvider>
    );

    fireEvent.click(screen.getByText("Trigger"));

    fireEvent.click(screen.getByText("Cancel"));

    await waitFor(() => {
      expect(result).toBe(false);
    });
  });

  // ✅ onConfirm callback
  it("calls onConfirm callback", async () => {
    const onConfirm = vi.fn();

    const TestConfirm = () => {
      const { showConfirm } = useAlert();

      return (
        <button onClick={() => showConfirm("Confirm?", { onConfirm })}>
          Trigger
        </button>
      );
    };

    render(
      <AlertProvider>
        <TestConfirm />
      </AlertProvider>
    );

    fireEvent.click(screen.getByText("Trigger"));
    expect(screen.getByText("Confirm?")).toBeInTheDocument(); // message

    const confirmBtn = screen.getByRole("button", { name: "Confirm" });
    expect(confirmBtn).toBeInTheDocument();

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
    });
  });

  // ✅ onCancel callback
  it("calls onCancel callback", async () => {
    const onCancel = vi.fn();

    const TestConfirm = () => {
      const { showConfirm } = useAlert();

      return (
        <button onClick={() => showConfirm("Confirm?", { onCancel })}>
          Trigger
        </button>
      );
    };

    render(
      <AlertProvider>
        <TestConfirm />
      </AlertProvider>
    );

    fireEvent.click(screen.getByText("Trigger"));
    fireEvent.click(screen.getByText("Cancel"));

    await waitFor(() => {
      expect(onCancel).toHaveBeenCalled();
    });
  });
});
