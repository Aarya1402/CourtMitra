import { useState, useLayoutEffect, useRef } from "react";
import styles from "./AuthPage.module.css";
import { SignIn, SignUp, GoogleLogin, ForgotPassword } from "./AuthPage.logic";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ArrowLeft } from "lucide-react";
import axios from "axios";

export type FormState = {
  name: string;
  email: string;
  password: string;
  organisation: string;
};

interface FieldProps {
  readonly label: string;
  readonly name: keyof FormState;
  readonly type: string;
  readonly placeholder: string;
  readonly value: string;
  readonly onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly forwardRef?: React.RefObject<HTMLDivElement | null>;
}

function Field({
  label,
  name,
  type,
  placeholder,
  value,
  onChange,
  forwardRef,
}: FieldProps) {
  return (
    <div className={styles.fieldWrapper} ref={forwardRef}>
      <label className={styles.label}>{label}</label>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        className={styles.input}
      />
    </div>
  );
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    organisation: "",
  });
  const [errorMsg, setErrorMsg] = useState<{ message: string }[]>([]);
  const [successMsg, setSuccessMsg] = useState("");
  const navigate = useNavigate();

  const cardRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardRef.current,
        { y: 20, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: "power3.out" }
      );

      gsap.fromTo(
        formRef.current?.children || [],
        { y: 15, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.08,
          ease: "power2.out",
          delay: 0.2,
        }
      );
    });
    return () => ctx.revert();
  }, [isLogin, isForgotPassword]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleGoogleLogin = async () => {
    try {
      const redirectUrl = `${globalThis.location.origin}/auth/callback`;
      await GoogleLogin(redirectUrl);
    } catch (error) {
      console.error("Google Login error:", error);
      setErrorMsg([{ message: "Failed to initialize Google Login" }]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg([]);
    setSuccessMsg("");

    try {
      if (isForgotPassword) {
        const redirectUrl = `${globalThis.location.origin}/reset-password`;
        await ForgotPassword(form.email, redirectUrl);
        setSuccessMsg("Password reset link has been sent to your email");
        return;
      }

      if (isLogin) {
        await SignIn(form.email, form.password);
      } else {
        await SignUp(form.name, form.email, form.password, form.organisation);
      }

      navigate("/");
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.data) {
        const data = error.response.data as Record<string, unknown>;
        const messages = data.errors || data;
        setErrorMsg(
          Array.isArray(messages)
            ? (messages as { message: string }[])
            : [{ message: String((messages as Record<string, unknown>).message || messages || "Error occurred") }]
        );
      } else if (error instanceof Error) {
        setErrorMsg([{ message: error.message || "Network Error" }]);
      } else {
        setErrorMsg([{ message: "An unknown error occurred" }]);
      }
      console.error("Auth error:", error);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card} ref={cardRef}>
        <h2 className={styles.title}>
          {isForgotPassword && "Reset Password"}
          {!isForgotPassword && isLogin ? "Welcome back" : "Create account"}
        </h2>
        <p className={styles.subtitle}>
          {isForgotPassword && "Enter your email to receive a reset link"}
          {!isForgotPassword && isLogin
            ? "Sign in to your account"
            : "Get started today"}
        </p>

        {successMsg && <p className={styles.successMessage}>{successMsg}</p>}

        <form onSubmit={handleSubmit} className={styles.form} ref={formRef}>
          {isForgotPassword ? (
            <Field
              label="Email"
              name="email"
              type="email"
              placeholder="john@talkument.co"
              value={form.email}
              onChange={handleChange}
            />
          ) : (
            <>
              {!isLogin && (
                <Field
                  label="Name"
                  name="name"
                  type="text"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={handleChange}
                />
              )}

              <Field
                label="Email"
                name="email"
                type="email"
                placeholder="john@talkument.co"
                value={form.email}
                onChange={handleChange}
              />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <Field
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                />
                {isLogin && (
                  <button
                    type="button"
                    className={styles.forgotPassword}
                    onClick={() => {
                      setIsForgotPassword(true);
                      setErrorMsg([]);
                      setSuccessMsg("");
                    }}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>

              {!isLogin && (
                <Field
                  label="Organisation name"
                  name="organisation"
                  type="text"
                  placeholder="Acme Inc."
                  value={form.organisation}
                  onChange={handleChange}
                />
              )}
            </>
          )}

          {errorMsg?.map((err: { message: string }, index: number) => (
            <p key={index + err.message} className={styles.error}>
              {err.message}
            </p>
          ))}
          <button type="submit" className={styles.button}>
            {isForgotPassword && "Send Reset Link"}
            {!isForgotPassword && isLogin ? "Login" : "Sign up"}
          </button>
        </form>

        {isForgotPassword ? (
          <button
            onClick={() => {
              setIsForgotPassword(false);
              setErrorMsg([]);
              setSuccessMsg("");
            }}
            className={styles.toggleText}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={16} /> Back to Login
          </button>
        ) : (
          <>
            <div className={styles.divider}>or</div>

            <button
              type="button"
              className={styles.googleButton}
              onClick={handleGoogleLogin}
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className={styles.googleLogo}
              />
              <span>Continue with Google</span>
            </button>

            <p className={styles.toggleText}>
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setForm({
                    name: "",
                    email: "",
                    password: "",
                    organisation: "",
                  });
                  setErrorMsg([]);
                  setSuccessMsg("");
                }}
                className={styles.toggleLink}
              >
                {isLogin ? "Sign up" : "Log in"}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
