import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GoogleCallback } from "./AuthPage.logic";
import styles from "./AuthPage.module.css";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get("code");
  const effectRan = useRef(false);

  useEffect(() => {
    if (effectRan.current) return;
    effectRan.current = true;

    const handleCallback = async () => {
      if (code) {
        try {
          const redirectUrl = `${window.location.origin}/auth/callback`;
          await GoogleCallback(code, redirectUrl);
          navigate("/");
        } catch (error) {
          console.error("Google Callback Error:", error);
          navigate("/auth?error=google_failed");
        }
      } else {
        navigate("/auth");
      }
    };

    handleCallback();
  }, [code, navigate]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h2 className={styles.title}>Authenticating...</h2>
        <p className={styles.subtitle}>Please wait while we sign you in.</p>
        <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem" }}>
           <div style={{ 
             width: "40px", 
             height: "40px", 
             border: "3px solid var(--accent-soft)", 
             borderTopColor: "var(--accent)", 
             borderRadius: "50%",
             animation: "spin 1s linear infinite"
           }}></div>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
