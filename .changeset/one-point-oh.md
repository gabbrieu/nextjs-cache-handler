---
"@leejpsd/nextjs-cache-handler": major
---

1.0 — the public API is now stable under semver.

Nothing changes for existing 0.4.x users: there are no breaking changes in this release. The version bump is a commitment, not a rewrite. From here, anything that would break a working setup waits for 2.0.

What that commitment covers:

- The eight entry points and everything they export, all of which are now documented in [`docs/api.md`](./docs/api.md) — including the SWR helpers (`partitionEntry`, `shouldServeStale`) that had been exported since 0.1 without being written down.
- `CacheHandlerOptions` and its twelve options.
- Redis key shapes and the tag-marker wire format, so mixed-version fleets stay readable in both directions during a rolling deploy.
- Metric event names.

Why now: the handler has been running against a real multi-instance deployment (24h live-traffic soak, plus a Redis-reboot drill with zero 5xx), both cache interfaces are exercised end-to-end against Next.js 16.3 stable, and the tag-invalidation semantics were re-derived from the Next.js source and corrected in 0.4.2. The remaining roadmap items (Vercel KV / Upstash adapters, `'use cache: remote'` multi-tier, a `neshClassicCache` equivalent) are additive and do not need a breaking change to land.
