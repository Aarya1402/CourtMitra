import "dotenv/config";
import * as Sentry from "@sentry/node";

if (process.env.NODE_ENV !== "test") {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    // Only propagate traces to local routes, NOT to external Talkument API
    // This prevents extra headers from causing 404s on the upstream server
    tracePropagationTargets: [/^\//, "localhost"],
    tracesSampleRate: 1,
  });
}
