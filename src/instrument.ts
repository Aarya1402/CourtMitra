import "dotenv/config";
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://75c65dcfc40dae15e615e4642a3dc299@sentry.drcsystems.com/65",
  // Only propagate traces to local routes, NOT to external Talkument API
  // This prevents extra headers from causing 404s on the upstream server
  tracePropagationTargets: [/^\//, "localhost"],
  tracesSampleRate: 1.0,
});
