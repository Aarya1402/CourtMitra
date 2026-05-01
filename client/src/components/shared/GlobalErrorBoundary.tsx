import React from "react";
import * as Sentry from "@sentry/react";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import styles from "./ErrorBoundary.module.css";

interface Props {
  children: React.ReactNode;
}

interface FallbackProps {
  error: unknown;
  resetError(): void;
}

const ErrorFallback: React.FC<FallbackProps> = ({ error, resetError }) => {
  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorCard}>
        <div className={styles.iconWrapper}>
          <AlertCircle size={48} className={styles.errorIcon} />
        </div>

        <h1 className={styles.errorTitle}>Something went wrong</h1>

        <p className={styles.errorMessage}>
          We've encountered an unexpected error. Don't worry, our team has been
          notified and is looking into it.
        </p>

        {import.meta.env.DEV && (
          <div className={styles.debugInfo}>
            <code>{String(error)}</code>
          </div>
        )}

        <div className={styles.buttonGroup}>
          <button onClick={resetError} className={styles.refreshButton}>
            <RefreshCcw size={18} />
            Try to Recover
          </button>

          <button
            onClick={() => (globalThis.location.href = "/")}
            className={styles.homeButton}
          >
            <Home size={18} />
            Go to Homepage
          </button>
        </div>
      </div>
    </div>
  );
};

// ✅ Proper Sentry fallback function
const renderFallback: Sentry.FallbackRender = (props) => {
  return <ErrorFallback {...props} />;
};

const GlobalErrorBoundary: React.FC<Props> = ({ children }) => {
  return (
    <Sentry.ErrorBoundary fallback={renderFallback} showDialog={false}>
      {children}
    </Sentry.ErrorBoundary>
  );
};

export default GlobalErrorBoundary;
