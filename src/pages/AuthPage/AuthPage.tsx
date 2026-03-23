import { useState } from "react";
import styles from "./AuthPage.module.css";
import { SignIn, SignUp } from "./AuthPage.logic";
import { useNavigate } from "react-router-dom";

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
}

function Field({
  label,
  name,
  type,
  placeholder,
  value,
  onChange,
}: FieldProps) {
  return (
    <div className={styles.fieldWrapper}>
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
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    organisation: "",
  });
  const [errorMsg, setErrorMsg] = useState<{ message: string }[]>([]);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg([]);

    try {
      if (isLogin) {
        await SignIn(form.email, form.password);
      } else {
        await SignUp(form.name, form.email, form.password, form.organisation);
      }

      navigate("/");
    } catch (error: any) {
      if (error.response && error.response.data) {
        const messages = error.response.data.errors || error.response.data;
        setErrorMsg(
          Array.isArray(messages)
            ? messages
            : [{ message: messages.message || "An error occurred" }],
        );
      } else {
        setErrorMsg([{ message: error.message || "Network Error" }]);
      }
      console.error("Auth error:", error);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setForm({ name: "", email: "", password: "", organisation: "" });
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h2 className={styles.title}>
          {isLogin ? "Welcome back" : "Create account"}
        </h2>
        <p className={styles.subtitle}>
          {isLogin ? "Sign in to your account" : "Get started today"}
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
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

          <Field
            label="Password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
          />

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
          {errorMsg?.map((err: { message: string }, index: number) => (
            <p key={index + err.message} className={styles.error}>
              {err.message}
            </p>
          ))}
          <button type="submit" className={styles.button}>
            {isLogin ? "Login" : "Sign up"}
          </button>
        </form>

        <p className={styles.toggleText}>
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button onClick={toggleMode} className={styles.toggleLink}>
            {isLogin ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}
