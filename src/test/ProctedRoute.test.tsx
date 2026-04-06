import { render, screen, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import ProtectedRoute from "../components/shared/ProtectedRoute";

// 🔥 mocks

// mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// mock auth function
vi.mock("../pages/HomePage/HomePage.logic", () => ({
  isLoggedIn: vi.fn(),
}));

import { isLoggedIn } from "../pages/HomePage/HomePage.logic";

// mock loader icon
vi.mock("lucide-react", () => ({
  Loader2: () => <svg data-testid="loader" />,
}));

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ✅ 1. shows loader initially
  test("shows loader while verifying", async () => {
    (isLoggedIn as any).mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId("loader")).toBeInTheDocument();
  });

  // ✅ 2. renders children when authenticated
  test("renders children when user is authenticated", async () => {
    (isLoggedIn as any).mockResolvedValue({});

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });
  });

  // ✅ 3. redirects when authentication fails
  test("redirects to /auth when authentication fails", async () => {
    (isLoggedIn as any).mockRejectedValue(new Error("Unauthorized"));

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/auth", { replace: true });
    });
  });

  // ✅ 4. calls isLoggedIn on mount
  test("calls isLoggedIn on mount", async () => {
    (isLoggedIn as any).mockResolvedValue({});

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(isLoggedIn).toHaveBeenCalled();
    });
  });

  // ✅ 5. hides loader after success
  test("hides loader after verification success", async () => {
    (isLoggedIn as any).mockResolvedValue({});

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(screen.queryByTestId("loader")).not.toBeInTheDocument();
    });
  });
});
