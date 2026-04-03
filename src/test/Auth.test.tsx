import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuthPage from "./../pages/AuthPage/AuthPage";
import { describe, vi } from "vitest";

// 🔥 Mock navigation
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// 🔥 Mock API functions
vi.mock("./../pages/AuthPage/AuthPage.logic", () => ({
  SignIn: vi.fn(),
  SignUp: vi.fn(),
}));

import { SignIn, SignUp } from "./../pages/AuthPage/AuthPage.logic";

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
    (SignIn as any).mockResolvedValue({});

    render(<AuthPage />);

    fireEvent.change(screen.getByPlaceholderText(/john@talkument.co/i), {
      target: { value: "test@mail.com" },
    });

    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
      target: { value: "123456" },
    });

    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(SignIn).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  // ✅ 5. Signup flow
  test("calls SignUp on signup", async () => {
    (SignUp as any).mockResolvedValue({});

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
      expect(SignUp).toHaveBeenCalled();
    });
  });

  // ✅ 6. Error handling
  test("shows error on failed login", async () => {
    (SignIn as any).mockRejectedValue({
      response: {
        data: { message: "Invalid credentials" },
      },
    });

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
});
