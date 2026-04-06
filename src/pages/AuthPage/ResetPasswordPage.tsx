import { useState, useRef, useLayoutEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ResetPassword } from "./AuthPage.logic";
import styles from "./AuthPage.module.css";
import gsap from "gsap";
import axios from "axios";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<{ message: string }[]>([]);
  const [successMsg, setSuccessMsg] = useState("");

  const cardRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardRef.current,
        { y: 20, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: "power3.out" }
      );
    });
    return () => ctx.revert();
  }, []);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg([]);
    setSuccessMsg("");

    if (password !== confirmPassword) {
      setErrorMsg([{ message: "Passwords do not match" }]);
      return;
    }

    try {
      await ResetPassword({
        token,
        new_password: password,
        confirm_password: confirmPassword,
      });
      setSuccessMsg("Password reset successfully! Redirecting to login...");
      setTimeout(() => navigate("/auth"), 2000);
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.data) {
        const data = error.response.data as Record<string, unknown>;
        const messages = data.errors || data;
        setErrorMsg(
          Array.isArray(messages)
            ? (messages as { message: string }[])
            : [
                {
                  message:
                    String((messages as Record<string, unknown>).message || (messages as Record<string, unknown>).detail || messages || "Error occurred"),
                },
              ]
        );
      } else if (error instanceof Error) {
        setErrorMsg([{ message: error.message || "Network Error" }]);
      } else {
        setErrorMsg([{ message: "An unknown error occurred" }]);
      }
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card} ref={cardRef}>
        <h2 className={styles.title}>Set New Password</h2>
        <p className={styles.subtitle}>Enter your new password below</p>

        {successMsg && <p className={styles.successMessage}>{successMsg}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.fieldWrapper}>
            <label htmlFor="password" className={styles.label}>
              New Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.fieldWrapper}>
            <label htmlFor="confirmPassword" className={styles.label}>
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={styles.input}
            />
          </div>

          {errorMsg?.map((err: { message: string }, index: number) => (
            <p key={index + err.message} className={styles.error}>
              {err.message}
            </p>
          ))}

          <button type="submit" className={styles.button}>
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}
