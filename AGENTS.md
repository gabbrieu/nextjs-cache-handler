# gabbrieu fork qualification scope

- This fork is maintained for the singular `cacheHandler` / `/incremental` path. Preserve the inherited module layout; `/cache-components` is not qualified for use by this fork and must not be selected or fixed without a separate request.
- The plural provider retained in the accompanying evaluation is `@flefebvre/nextjs-redis-cache-handler@0.1.0`. Do not infer plural qualification from shared client changes or from the upstream overview below.
- Read `FORK_NOTES.md` for the exact upstream base, patch identity, pre-fork validation and limits. Reuse unchanged proofs; validate only a real code/artifact/configuration delta. Do not claim new CI results for the repository copy.
- There is no fork package release. The upstream package name/version, CLI/scaffolding imports and release workflow remain inherited. Do not run init/doctor/setup against an application, publish, bump versions or change a consumer application without separate authorization.
- Preserve the original MIT notices. Keep changes minimal and avoid unrelated refactoring or introducing a cache framework/adapter.

## Inherited upstream guidance

The overview and recipes below describe the upstream package. Apply them only within the incremental-only scope above; they do not override the consumer project's instructions or authorize installation, runtime/infra changes or publication.

# @leejpsd/nextjs-cache-handler — notes for AI agents

Redis cache handler for **self-hosted** Next.js 15/16. Ships BOTH interfaces:
`cacheHandler` (ISR, Next 15+16) and `cacheHandlers` (`'use cache'`,
Next >= 16.1.5). Not for Vercel-hosted apps.

**Full agent guidance:** `skills/nextjs-redis-cache/SKILL.md` in this package
(also installable via `npx skills add leejpsd/nextjs-cache-handler`).
**Agent-executable setup:**
https://raw.githubusercontent.com/leejpsd/nextjs-cache-handler/main/setup-instructions/setup.md

## Rules that prevent the most common mistakes

1. `revalidateTag(tag, "max")` is SOFT = stale-while-revalidate: instant
   stale serve + background re-render, cross-instance convergence in ~1-2s.
   Brief stale content is BY DESIGN — not a bug. `updateTag(tag)` is HARD =
   delete + blocking regeneration. Requires version >= 0.3.3.
2. `cacheMaxMemorySize: 0` in next.config is mandatory for multi-instance
   correctness. Do not remove it.
3. `DEPLOYMENT_VERSION` env must exist at RUNTIME (Docker runner stage).
   Missing → cross-deploy cache bleed / static chunk 404s.
4. Redis Cluster needs `hashTag: true`; TLS via `rediss://` URLs.
5. Build-time `ECONNREFUSED` toward Redis is expected (build-phase gate) —
   only investigate if the build fails.
6. Redis outages degrade to a bounded in-memory fallback with automatic
   reconnect (backoff 1s→30s). Do not wrap cache calls in extra try/catch.
7. Wiring shape: two CJS wrapper files + `require.resolve` in next.config —
   see README "Quick start" or the setup URL above.

Entry points: `/incremental` (ISR), `/cache-components` ('use cache'),
`/client/redis`, `/client/ioredis` (incl. cluster/sentinel), `/ops`
(metric snapshot), `/otel` (OpenTelemetry emitter). API details: README.md
and https://github.com/leejpsd/nextjs-cache-handler/blob/main/docs/api.md
