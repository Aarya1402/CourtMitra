import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuthPage from "../pages/AuthPage/AuthPage";
import { beforeEach, describe, vi } from "vitest";

// 🔥 Mock navigation
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// 🔥 Mock GSAP (important)
vi.mock("gsap", () => ({
  default: {
    context: () => ({
      revert: vi.fn(),
    }),
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
    vi.mocked(AuthApi.SignIn).mockResolvedValue({} as any);

    render(<AuthPage />);

    fireEvent.change(screen.getByPlaceholderText(/john@talkument.co/i), {
      target: { value: "test@mail.com" },
    });

    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: "123456" },
    });

    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(AuthApi.SignIn).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  // ✅ 5. Signup flow
  test("calls SignUp on signup", async () => {
    vi.mocked(AuthApi.SignUp).mockResolvedValue({} as any);

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

    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(AuthApi.SignUp).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  // ✅ 6. Error handling (API response)
  test("shows error on failed login", async () => {
    vi.mocked(AuthApi.SignIn).mockRejectedValue({
      response: {
        data: { message: "Invalid credentials" },
      },
    } as any);

    render(<AuthPage />);

    fireEvent.change(screen.getByPlaceholderText(/john@talkument.co/i), {
      target: { value: "wrong@mail.com" },
    });

    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: "wrong" },
    });

    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  // ✅ 7. Network error fallback
  test("shows network error if no response", async () => {
    vi.mocked(AuthApi.SignIn).mockRejectedValue(new Error("Network Error"));

    render(<AuthPage />);

    fireEvent.change(screen.getByPlaceholderText(/john@talkument.co/i), {
      target: { value: "test@mail.com" },
    });

    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: "123456" },
    });

    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  // ✅ 8. Forgot password flow
  test("handles forgot password", async () => {
    vi.mocked(AuthApi.ForgotPassword).mockResolvedValue({} as any);

    render(<AuthPage />);

    fireEvent.click(screen.getByText(/forgot password/i));

    fireEvent.change(screen.getByPlaceholderText(/john@talkument.co/i), {
      target: { value: "test@mail.com" },
    });

    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(AuthApi.ForgotPassword).toHaveBeenCalled();
      expect(
        screen.getByText(/password reset link has been sent/i)
      ).toBeInTheDocument();
    });
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
    vi.mocked(AuthApi.GoogleLogin).mockResolvedValue({} as any);

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

    await waitFor(() => {
      expect(
        screen.getByText(/failed to initialize google login/i)
      ).toBeInTheDocument();
    });
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
});
