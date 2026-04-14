import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

export default defineCloudflareConfig({
	// Use static assets as incremental cache so pre-rendered blog pages
	// are served from Workers Assets (cdn-cgi/_next_cache/) instead of
	// falling back to dynamic rendering (which fails in CF Workers).
	// Run `opennextjs-cloudflare populateCache` after build to copy the cache.
	incrementalCache: staticAssetsIncrementalCache,
});
