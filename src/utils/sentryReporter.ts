import * as Sentry from "@sentry/react";

/**
 * Utility to report handled errors to Sentry with additional context.
 * Best practice for try/catch blocks where we handle the error but still want to track it.
 */
export const reportError = (error: any, context?: Record<string, any>) => {
  console.error("Reporting Error to Sentry:", error, context);
  
  Sentry.captureException(error, {
    extra: context,
  });
};

/**
 * Utility to track custom messages or breadcrumbs.
 */
export const logMessage = (message: string, level: Sentry.SeverityLevel = "info") => {
  Sentry.addBreadcrumb({
    category: "app",
    message: message,
    level: level,
  });
};
