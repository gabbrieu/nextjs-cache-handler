# Focused invalidation and factory regressions

These tests exercise the unpublished source changes. They do not require a Next.js
application, private workspace, AWS account or prebuilt project image. Use the
repository lockfile with a supported Node.js runtime. Install dependencies with
`npm ci --ignore-scripts` and use the local tools below; no global CLI is required.

## Unit regressions (no service)

```sh
node node_modules/vitest/vitest.mjs run tests/unit/ioredis-readiness.test.ts tests/unit/client-config.test.ts
```

The readiness tests cover both public ioredis adapters: already connecting,
connected-but-not-ready and reconnecting clients; already ready/lazy/ended
clients; error, close/end, bounded timeout and listener/timer cleanup. The timeout
configuration tests construct real lazy clients without network I/O and check the
native cluster default, explicit override and zero value.

## Real auto-connecting factory

Start one **disposable local** Redis-compatible server, for example:

```sh
docker run --rm --name next-cache-factory-test -p 127.0.0.1:6390:6379 redis:7-alpine redis-server --save "" --appendonly no
```

Leave it running and execute in another terminal:

```sh
node node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts tests/integration/ioredis-factory-invalidation.test.ts
```

The default destination is `redis://127.0.0.1:6390`. The existing
`INTEGRATION_REDIS_URL` environment variable can select another disposable local
instance. A healthy control must answer PONG. Each positive case creates a real
auto-connecting `new Redis()` inside the factory, then confirms concurrent tag
marker writes for legacy hard, explicit hard and soft invalidation. Only one
factory instance should be created per handler. The negative uses a reserved and
released loopback port and must reject without a remote-success metric.

The tests use a random key prefix and delete only their own markers; they do not
flush the database. They fail if the required fixture is unavailable. Stop the
dedicated container with `docker stop next-cache-factory-test` after the run.
Do not point this suite at a production or shared business cache.

These focused tests do not claim managed TLS, cluster failover, durability through
promotion, IAM rotation, capacity or a complete upstream CI matrix. The separate
cluster/TLS evidence can accompany a contribution with its exact versions and
limits. Run additional existing suites only when the changed behavior warrants it.
