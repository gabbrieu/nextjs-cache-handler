# API reference

Package: `@leejpsd/nextjs-cache-handler` — Redis cache handler for Next.js
15/16 shipping both handler interfaces. All entry points are dual-published
(ESM + CJS) with TypeScript types.

## Entry points

| Subpath | Exports | Use for |
|---|---|---|
| `@leejpsd/nextjs-cache-handler` | everything below + types | convenience root |
| `.../cache-components` | `createCacheComponentsHandler` | Next 16 `cacheHandlers` (plural) — `'use cache'`, `cacheComponents: true` |
| `.../incremental` | `createIncrementalCacheHandler` | `cacheHandler` (singular) — ISR, Pages Router, fetch cache. Next 15 and 16 |
| `.../client/redis` | `adaptRedisV5`, `createRedisV5Client` | wrap your own `redis@5` client |
| `.../client/ioredis` | `adaptIoredis`, `adaptCluster`, `createIoredisClient`, `createIoredisSentinel`, `createIoredisCluster` | wrap your own ioredis / Cluster / Sentinel client |
| `.../ops` | `getMetricSnapshot` | process-local metric counters for health endpoints |
| `.../otel` | `createOtelMetricEmitter` | built-in OpenTelemetry adapter (needs `@opentelemetry/api` in your app) |
| `.../seed` | `seedBuildOutput` | seed `.next` build output into Redis (NX-protected) — also `npx nextjs-cache-handler seed` |

## Factories

### `createCacheComponentsHandler(options: CacheHandlerOptions)`

Returns the object Next.js expects for `cacheHandlers.default` (methods:
`get`, `set`, `refreshTags`, `getExpiration`, `updateTags`). Requires
Next.js >= 16.1.5.

### `createIncrementalCacheHandler(options: CacheHandlerOptions)`

Returns a **class** for `cacheHandler` (Next.js instantiates it per request
with `new CacheHandler(ctx)`; methods: `get`, `set`, `revalidateTag`,
`resetRequestCache`). Works on Next.js 15 and 16 — both generations of the
ctx contract are accepted (`ctx.cacheControl.revalidate` / `kind` and
`ctx.revalidate` / `kindHint`).

## `CacheHandlerOptions`

| Option | Type | Default | Notes |
|---|---|---|---|
| `client` | `RedisClientFactory \| RedisClientConfig` | **required** | factory function or lazy config object |
| `keyPrefix` | `string` | `"next-cache:"` / `"next-incremental:"` | multi-app Redis sharing |
| `buildNamespace` | `string \| () => string` | `DEPLOYMENT_VERSION ?? GIT_HASH ?? NEXT_DEPLOYMENT_ID ?? "unversioned"` | per-deploy key isolation; function form defers env read |
| `abortTimeoutMs` | `number` | `1500` | per-operation deadline; timeout ⇒ miss (reads) / ignored (entry writes) / thrown (remote singular invalidation, hard or soft) |
| `fallback` | `"auto" \| "always" \| "never"` | `"auto"` | `always` = memory only (never connect); `never` = strict, Redis failures surface as misses |
| `memoryMaxEntries` | `number` | `1000` | LRU cap for the in-memory fallback (and its tag index) |
| `compression` | `"gzip" \| "brotli"` | off | transparent Redis value compression (node:zlib). Reads auto-detect, so mixed fleets interoperate; < 1 KiB stored plain |
| `staleWhileRevalidate` | `boolean` | `true` | plural handler only: serve stale in the SWR window |
| `singleFlight` | `boolean` | `false` | opt-in refresh lock at the SWR boundary (stampede suppression) |
| `singleFlightLockTtlSec` | `number` | `10` | lock TTL for `singleFlight` |
| `isBuildPhase` | `() => boolean` | `NEXT_PHASE === "phase-production-build"` | build-phase gate override |
| `hashTag` | `boolean` | `false` | wrap namespace in `{}` — **required on Redis Cluster** (multi-key Lua) |
| `tagPubSub` | `boolean` | `false` | push-based cross-instance tag propagation (plural handler; ~3ms); scan polling remains the safety net; unavailable on Cluster |
| `onMetric` | `(event: MetricEvent) => void` | — | telemetry hook; emitter errors are swallowed |
| `logger` | `Logger` | console (warn+) | injectable 4-level logger |

## `RedisClientConfig`

```ts
| { type: "redis";    url; password?; tls?; connectTimeout? }   // node-redis v5
| { type: "ioredis";  url; password?; tls?; connectTimeout? }
| { type: "cluster";  nodes: {host, port}[]; username?; password?;
    tls?: boolean | import("node:tls").ConnectionOptions;
    dnsLookup?; connectTimeout?; commandTimeout?; slotsRefreshTimeout? }
    // ioredis Cluster — set hashTag: true
| { type: "sentinel"; sentinels: {host, port}[]; name;          // ioredis Sentinel — master discovery + failover
    password?; sentinelPassword?; tls?; connectTimeout? }
```

`tls: true` enables TLS explicitly; `rediss://` URLs auto-enable it on the
`redis` client type. Clients constructed from ioredis-family configuration use
lazy connect and auto-pipelining. A factory can also wrap an auto-connecting
client with `adaptIoredis` or `adaptCluster`: the adapter waits for `ready`
without calling `connect()` again. An error or a connection close/end rejects
the wait. Its budget is the positive configured `connectTimeout`, or 10 seconds
when absent/disabled; listeners and the timer are removed on every outcome.
The handler's separate operation deadline still applies and does not cancel a
connection or command already in progress.

Connection management: a failed connect is retried with exponential backoff
(1s base, doubling, capped at 30s); during the cooldown operations fast-fail
to the fallback path. Dropped connections are replaced automatically.

You can also pass a **factory** returning any object satisfying
`RedisClientLike` (see `src/types.ts`) — useful for Upstash/custom clients.

## SWR helpers (`.../cache-components` and root)

Exported so custom logic can reuse the same freshness rules the handler
applies internally. Stable as of 1.0.

### `partitionEntry(entry, now?)`

Classifies an entry by age against its own `revalidate` / `expire` window.
`entry` needs only `{ timestamp, revalidate, expire }`.

Returns `{ freshness: "fresh" | "stale" | "expired", ageMs }`:

- `fresh` — within `revalidate`
- `stale` — past `revalidate`, still within `expire` (serve and refresh)
- `expired` — past `expire` (do not serve)

`expire: 0` is treated as the never-expire sentinel, and `expire` is clamped
up to `revalidate` when a profile declares it smaller.

### `shouldServeStale(result, staleWhileRevalidate)`

`true` when a `partitionEntry` result should still be served. Honors the
`staleWhileRevalidate` option, which governs **time-based** staleness only —
tag invalidation is decided by the upstream contract, not this option.

### `IncrementalRedisCacheHandler`

The class produced by `createIncrementalCacheHandler`. Exported for type
positions; construct it through the factory rather than directly.

## Metric events (`MetricEventType`)

`cache.hit` · `cache.miss` · `cache.get.deduped` · `cache.stale` ·
`cache.stale.refresh.leader` · `cache.stale.refresh.follower` · `cache.set` ·
`cache.set.failed` · `tag.invalidate.soft` · `tag.invalidate.hard` ·
`tag.expiration.read` · `redis.connect.failed` · `redis.timeout` ·
`fallback.activated` · `build_phase.skip`

Events may carry `ms` (latency) and low-cardinality `meta` (`backend`,
`reason`, `op`, counts). Cache keys and tag names are never emitted.

### `getMetricSnapshot()` (`.../ops`)

Returns `{ [eventType]: { count, avgMs, lastTs } }` from always-on
process-local counters. Suitable for `/api/health`-style endpoints.

### `createOtelMetricEmitter(options?)` (`.../otel`)

Builds a `MetricEmitter` forwarding events to OpenTelemetry: counter
`nextjs_cache.events_total` + histogram `nextjs_cache.op_latency_ms`,
attributes limited to `type`, `freshness`, `backend`, `reason`, `op`.
Requires `@opentelemetry/api` installed in **your app** (it is an optional
peer, resolved at runtime). Options: `api` (inject the module — tests/custom
setups), `meterName`, `counterName`, `histogramName`.

## Behavioral notes

- **Key layout**: `"<keyPrefix><kind>:<namespace>:<rest>"`, e.g.
  `next-cache:entry:<deploy>:<key>`, `next-cache:tag:<deploy>:<tag>`,
  `next-cache:tag-expiration:<deploy>:<tag>`,
  `next-incremental:entry:<deploy>:<path>`. ISR tag state
  (`next-incremental:tag:<tag>`) is deliberately **not** namespaced so
  `revalidateTag` from a new deploy invalidates older deploys' entries.
- **Request-scoped dedup** (singular): repeated reads of one cache key within
  a request share a single Redis GET; `set()` invalidates the memo and
  `resetRequestCache()` clears it at request boundaries.
- **`instance-local:` tag prefix** (singular): entries tagged
  `instance-local:*` are stored in process memory only and never touch Redis.
- **Error policy**: reads never throw (degrade to miss); writes are
  best-effort; hard plural tag invalidation (`updateTags` with `expire: 0`) and
  remote singular `revalidateTag` propagate errors so callers can retry. The singular handler
  requires confirmed remote marker writes for both soft and hard invalidation,
  including initial connection failure and reconnect cooldown. Memory markers,
  logging and a pending retry do not confirm invalidation on other instances.
  Explicit build/local-only paths remain local. Reads and entry writes keep
  their existing best-effort/fallback behavior.
- **`CacheTimeoutError`** is exported from the root for `instanceof` checks.

For cluster TLS, `tls: true` keeps the existing defaults. A TLS options object
allows a custom CA and server identity without disabling certificate checks.
`username`, `password` and TLS options are passed to every discovered node;
`dnsLookup` is passed to ioredis Cluster (for example, preserve managed endpoint
hostnames with `(address, callback) => callback(null, address)`). Static ACL
credentials are supported; this does not implement IAM credential rotation.
For cluster clients, `connectTimeout` is only forwarded when configured, retaining
ioredis's native default (currently 10000ms). The existing single-node/Sentinel
configuration default remains 1500ms. `commandTimeout` and cluster
`slotsRefreshTimeout` are optional. Handler deadlines stop waiting, but do not
cancel an already dispatched Redis operation; a rejected call may have partially
written markers and callers must treat the result as unconfirmed, not rolled back.

The newly explicit soft-error rejection is an intentional compatibility change;
the accompanying changeset proposes a major release for maintainer review. It
does not relax remote confirmation or select a production release. See
[focused regression instructions](./testing-redis-invalidation.md).
