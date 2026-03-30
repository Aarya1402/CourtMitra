import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store/index.ts";
import axios from "axios";
import * as Sentry from "@sentry/react";

import { AlertProvider } from "./context/AlertContext.tsx";
import GlobalErrorBoundary from "./components/shared/GlobalErrorBoundary.tsx";
import { API_BASE_URL } from "./constants/api.ts";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "https://f4c4097ad3eff7098446c7186987e203@sentry.drcsystems.com/64",
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: true,
    }),
  ],

  // Performance Monitoring
  tracesSampleRate: 1.0,
  
  // Session Replay
  replaysSessionSampleRate: 0.1, 
  replaysOnErrorSampleRate: 1.0,

  tracePropagationTargets: ["localhost", API_BASE_URL],
});

// Configure Axios Global Interceptor for Sentry reporting
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Report server errors (5xx) or network errors as exceptions
    if (!error.response || error.response.status >= 500) {
      Sentry.captureException(error, {
        tags: { type: "api_error" },
        extra: {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
        },
      });
    }
    return Promise.reject(error);
  }
);

axios.defaults.withCredentials = true;

createRoot(document.getElementById("root")!).render(
  <GlobalErrorBoundary>
    <Provider store={store}>
      <AlertProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AlertProvider>
    </Provider>
  </GlobalErrorBoundary>
);
