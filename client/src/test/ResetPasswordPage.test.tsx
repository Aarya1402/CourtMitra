import { render, screen, fireEvent, act } from "@testing-library/react";
import ResetPasswordPage from "../pages/AuthPage/ResetPasswordPage";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import * as AuthLogic from "../pages/AuthPage/AuthPage.logic";
import axios from "axios";
vi.mock("axios", () => ({
  default: {
    isAxiosError: vi.fn((error: unknown) => typeof error === "object" && error !== null && (error as any).isAxiosError === true),
  },
  isAxiosError: vi.fn((error: unknown) => typeof error === "object" && error !== null && (error as any).isAxiosError === true),
}));

// 🔥 Mock logic
vi.mock("../pages/AuthPage/AuthPage.logic", () => ({
  ResetPassword: vi.fn(),
  ForgotPassword: vi.fn(),
  SignIn: vi.fn(),
  SignUp: vi.fn(),
  GoogleLogin: vi.fn(),
}));

// 🔥 Mock GSAP
vi.mock("gsap", () => ({
  default: {
    context: () => ({
      revert: vi.fn(),
    }),
    fromTo: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual<any>("react-router-dom");
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  const setup = (token = "test-token") => {
    return render(
      <MemoryRouter initialEntries={[`/reset-password?token=${token}`]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it("renders the reset password form", () => {
    setup();
    expect(screen.getByText(/set new password/i)).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText("••••••••")).toHaveLength(2);
  });

  it("shows error if passwords do not match", async () => {
    setup();
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "pass123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "pass456" } });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(AuthLogic.ResetPassword).not.toHaveBeenCalled();
  });

  it("handles successful password reset", async () => {
    vi.useFakeTimers();
    vi.mocked(AuthLogic.ResetPassword).mockResolvedValueOnce({} as any);
    setup();
    
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "newpass123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "newpass123" } });
    
    await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /reset password/i }));
    });

    // Flush microtasks to reach success state
    await vi.advanceTimersByTimeAsync(0);

    expect(screen.getByText(/password reset successfully/i)).toBeInTheDocument();
    expect(AuthLogic.ResetPassword).toHaveBeenCalledWith({
      token: "test-token",
      new_password: "newpass123",
      confirm_password: "newpass123",
    });

    // Advance 2000ms for redirect
    await act(async () => {
        vi.advanceTimersByTime(2000);
    });
    
    expect(mockNavigate).toHaveBeenCalledWith("/auth");
    vi.useRealTimers();
  });

  it("handles API error with 'errors' array", async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    vi.mocked(AuthLogic.ResetPassword).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        data: {
          errors: [{ message: "Password too weak" }],
        },
      },
    });

    setup();
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "abc" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    // screen.debug(); // Uncomment if still failing to see what's rendered
    expect(await screen.findByText(/password too weak/i)).toBeInTheDocument();
  });

  it("handles API error with 'message' string", async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    vi.mocked(AuthLogic.ResetPassword).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        data: {
          message: "Invalid token",
        },
      },
    });

    setup();
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "abc123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "abc123" } });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    expect(await screen.findByText(/invalid token/i)).toBeInTheDocument();
  });

  it("handles API error with 'detail' string", async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    vi.mocked(AuthLogic.ResetPassword).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        data: {
          detail: "Token expired",
        },
      },
    });

    setup();
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "abc123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "abc123" } });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    expect(await screen.findByText(/token expired/i)).toBeInTheDocument();
  });

  it("handles direct API data error", async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    vi.mocked(AuthLogic.ResetPassword).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        data: "Random server error",
      },
    });

    setup();
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "abc123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "abc123" } });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    expect(await screen.findByText(/random server error/i)).toBeInTheDocument();
  });

  it("handles network Error object", async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(false);
    vi.mocked(AuthLogic.ResetPassword).mockRejectedValueOnce(new Error("Connection lost"));

    setup();
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "abc123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "abc123" } });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    expect(await screen.findByText(/connection lost/i)).toBeInTheDocument();
  });

  it("handles unknown error type", async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(false);
    vi.mocked(AuthLogic.ResetPassword).mockRejectedValueOnce("Something weird");

    setup();
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: "abc123" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "abc123" } });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    expect(await screen.findByText(/an unknown error occurred/i)).toBeInTheDocument();
  });
});
