import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import AuthPage from "../pages/AuthPage/AuthPage";
import { beforeEach, describe, vi, expect, test } from "vitest";
import axios from "axios";

vi.mock("axios", () => ({
  default: {
    isAxiosError: vi.fn((error: unknown) => typeof error === "object" && error !== null && (error as any).isAxiosError === true),
  },
  isAxiosError: vi.fn((error: unknown) => typeof error === "object" && error !== null && (error as any).isAxiosError === true),
}));

// 🔥 Mock navigation
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// 🔥 Mock GSAP
vi.mock("gsap", () => ({
  default: {
    context: (cb: any) => {
      if (typeof cb === "function") cb();
      return { revert: vi.fn() };
    },
    fromTo: vi.fn(),
  },
}));

// 🔥 Mock API functions
vi.mock("../pages/AuthPage/AuthPage.logic", () => ({
  SignIn: vi.fn(),
  SignUp: vi.fn(),
  GoogleLogin: vi.fn(),
  ForgotPassword: vi.fn(),
}));

import * as AuthApi from "../pages/AuthPage/AuthPage.logic";

describe("AuthPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ✅ 1. Render Login UI
  test("renders login form by default", () => {
    render(<AuthPage />);
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/john@talkument.co/i)
    ).toBeInTheDocument();
  });

  // ✅ 2. Toggle to Signup
  test("switches to signup mode", () => {
    render(<AuthPage />);
    fireEvent.click(screen.getByText(/sign up/i));

    expect(screen.getByText(/create account/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/your full name/i)).toBeInTheDocument();
  });

  // ✅ 3. Input change
  test("updates input values", () => {
    render(<AuthPage />);

    const emailInput = screen.getByPlaceholderText(/john@talkument.co/i);
    fireEvent.change(emailInput, { target: { value: "test@mail.com" } });

    expect(emailInput).toHaveValue("test@mail.com");
  });

  // ✅ 4. Login success
  test("calls SignIn and navigates on success", async () => {
    vi.mocked(AuthApi.SignIn).mockResolvedValue({} as unknown);

    render(<AuthPage />);

    fireEvent.change(screen.getByPlaceholderText(/john@talkument.co/i), {
      target: { value: "test@mail.com" },
    });

    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: "123456" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /login/i }));
    });

    await waitFor(() => {
      expect(AuthApi.SignIn).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  // ✅ 5. Signup flow
  test("calls SignUp on signup", async () => {
    vi.mocked(AuthApi.SignUp).mockResolvedValue({} as unknown);

    render(<AuthPage />);

    fireEvent.click(screen.getByText(/sign up/i));

    fireEvent.change(screen.getByPlaceholderText(/your full name/i), {
      target: { value: "Krish" },
    });

    fireEvent.change(screen.getByPlaceholderText(/john@talkument.co/i), {
      target: { value: "test@mail.com" },
    });

    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: "123456" },
    });

    fireEvent.change(screen.getByPlaceholderText(/acme inc/i), {
      target: { value: "Company" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /sign up/i }));
    });

    await waitFor(() => {
      expect(AuthApi.SignUp).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  // ✅ 6. Error handling (API response)
  test("shows error on failed login", async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    vi.mocked(AuthApi.SignIn).mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          errors: [{ message: "Invalid credentials" }],
        },
      },
    });

    render(<AuthPage />);

    fireEvent.change(screen.getByPlaceholderText(/john@talkument.co/i), {
      target: { value: "wrong@mail.com" },
    });

    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: "wrong" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /login/i }));
    });

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });

  // ✅ 7. Network error fallback
  test("shows network error if no response", async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(false);
    vi.mocked(AuthApi.SignIn).mockRejectedValue(new Error("Network Error"));

    render(<AuthPage />);

    fireEvent.change(screen.getByPlaceholderText(/john@talkument.co/i), {
      target: { value: "test@mail.com" },
    });

    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: "123456" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /login/i }));
    });

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });

  // ✅ 8. Forgot password flow
  test("handles forgot password", async () => {
    vi.mocked(AuthApi.ForgotPassword).mockResolvedValue({} as unknown);

    render(<AuthPage />);

    fireEvent.click(screen.getByText(/forgot password/i));

    fireEvent.change(screen.getByPlaceholderText(/john@talkument.co/i), {
      target: { value: "test@mail.com" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));
    });

    expect(await screen.findByText(/password reset link has been sent/i)).toBeInTheDocument();
  });

  // ✅ 9. Back to login from forgot password
  test("returns to login view", () => {
    render(<AuthPage />);

    fireEvent.click(screen.getByText(/forgot password/i));
    fireEvent.click(screen.getByText(/back to login/i));

    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  });

  // ✅ 10. Google login success
  test("calls GoogleLogin", async () => {
    vi.mocked(AuthApi.GoogleLogin).mockResolvedValue({} as unknown);

    render(<AuthPage />);

    fireEvent.click(screen.getByText(/continue with google/i));

    await waitFor(() => {
      expect(AuthApi.GoogleLogin).toHaveBeenCalled();
    });
  });

  // ✅ 11. Google login error
  test("handles Google login error", async () => {
    vi.mocked(AuthApi.GoogleLogin).mockRejectedValue(new Error("fail"));

    render(<AuthPage />);

    fireEvent.click(screen.getByText(/continue with google/i));

    expect(await screen.findByText(/failed to initialize google login/i)).toBeInTheDocument();
  });

  // ✅ 12. Form reset on toggle
  test("resets form on toggle", () => {
    render(<AuthPage />);

    fireEvent.change(screen.getByPlaceholderText(/john@talkument.co/i), {
      target: { value: "test@mail.com" },
    });

    fireEvent.click(screen.getByText(/sign up/i));
    fireEvent.click(screen.getByText(/log in/i));

    expect(screen.getByPlaceholderText(/john@talkument.co/i)).toHaveValue("");
  });

  // ✅ 13. Deep Error Handling Coverage
  test("handles API error with 'message' string", async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    vi.mocked(AuthApi.SignIn).mockRejectedValue({
      isAxiosError: true,
      response: {
        data: { message: "Single error message" },
      },
    });

    render(<AuthPage />);
    
    fireEvent.change(screen.getByPlaceholderText(/john@talkument.co/i), {
      target: { value: "test@mail.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: "123456" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /login/i }));
    });

    expect(await screen.findByText(/single error message/i)).toBeInTheDocument();
  });

  test("handles API error with 'errors' as simple strings", async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    vi.mocked(AuthApi.SignIn).mockRejectedValue({
      isAxiosError: true,
      response: {
        data: { errors: ["Error 1", "Error 2"] },
      },
    });

    render(<AuthPage />);

    fireEvent.change(screen.getByPlaceholderText(/john@talkument.co/i), {
      target: { value: "test@mail.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: "123456" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /login/i }));
    });

    expect(await screen.findByText(/error 1/i)).toBeInTheDocument();
    expect(await screen.findByText(/error 2/i)).toBeInTheDocument();
  });

  test("handles unknown API error field", async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    vi.mocked(AuthApi.SignIn).mockRejectedValue({
      isAxiosError: true,
      response: {
        data: { unknown_field: "something" },
      },
    });

    render(<AuthPage />);

    fireEvent.change(screen.getByPlaceholderText(/john@talkument.co/i), {
      target: { value: "test@mail.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: "123456" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /login/i }));
    });

    expect(await screen.findByText(/an unknown error occurred/i)).toBeInTheDocument();
  });

  test("handles completely unknown error type", async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(false);
    vi.mocked(AuthApi.SignIn).mockRejectedValue("string error");

    render(<AuthPage />);

    fireEvent.change(screen.getByPlaceholderText(/john@talkument.co/i), {
      target: { value: "test@mail.com" },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: "123456" },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /login/i }));
    });

    expect(await screen.findByText(/an unknown error occurred/i)).toBeInTheDocument();
  });
});
