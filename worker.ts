/**
 * Custom Cloudflare Worker entry.
 *
 * Wraps the OpenNext-generated fetch handler with Sentry so errors reported via
 * reportError() (src/lib/report-error.ts) inside route handlers are captured
 * with request context. `wrangler.jsonc` `main` points here instead of
 * `.open-next/worker.js`.
 *
 * See https://opennext.js.org/cloudflare/howtos/custom-worker
 */
import * as Sentry from "@sentry/cloudflare";
// @ts-expect-error `.open-next/worker.js` is generated at build time
import { default as handler } from "./.open-next/worker.js";

// The OpenNext runtime relies on these Durable Objects being exported from the
// worker entry — they must be re-exported here or the deploy fails.
// @ts-expect-error generated at build time
export { DOQueueHandler } from "./.open-next/worker.js";
// @ts-expect-error generated at build time
export { DOShardedTagCache } from "./.open-next/worker.js";
// @ts-expect-error generated at build time
export { BucketCachePurge } from "./.open-next/worker.js";

export default Sentry.withSentry(
  (env: CloudflareEnv & { SENTRY_DSN?: string }) => ({
    dsn: env.SENTRY_DSN,
    // No DSN in local dev / preview — keep Sentry fully inert there.
    enabled: Boolean(env.SENTRY_DSN),
    environment: env.NEXTJS_ENV || "production",
    tracesSampleRate: 0.1,
    // Never ship user PII (audio, request bodies) to Sentry.
    sendDefaultPii: false,
  }),
  handler as ExportedHandler<CloudflareEnv>
);
