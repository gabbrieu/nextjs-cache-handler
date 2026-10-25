# gabbrieu fork: incremental cache handler

This source fork targets the singular `cacheHandler` / `/incremental` path. It preserves the upstream module layout and MIT license. The inherited `/cache-components` implementation is not qualified by this fork and is not selected for use. The accompanying evaluation retains `@flefebvre/nextjs-redis-cache-handler@0.1.0` for the plural Cache Components interface.

## Patch identity and scope

- Upstream base: `348ec052836407b1aadecf7c811e1a920766fad9`.
- Exact reviewed patch SHA-256: `cac42d02f654aa2f3b3c9ff5aee5e3965af9d489599d2e0571d9f0b92e68c558`.
- Patch commit: `0580938656af0742bf496ebe512d24ff0a685e46`.
- The patch consists of 13 files, 491 additions and 16 deletions.

The incremental handler requires confirmed remote invalidation writes, including soft invalidation, rather than treating connection failure or reconnect cooldown as confirmation. The shared client changes support that path: preserve readiness of auto-connecting ioredis factories, remove listeners/timers on all outcomes, retain the native cluster connection timeout when unspecified, and expose the required cluster ACL/TLS/DNS options.

Shared client code remains shared, but these changes do not qualify the inherited plural handler or fix its separately observed pending-write concurrency failure. No new cache adapter, application wrapper or Cache Components fix was added.

## Reused validation snapshot: 2026-10-23

The patch in the first commit is byte-for-byte the already reviewed patch, verified before commit. Existing focused validation is retained rather than repeated for the repository copy:

| Historical runtime | Client | Focused unit checks | Real TLS/ACL Cluster checks |
| --- | --- | --- | --- |
| Node 20.20.2 | ioredis 5.10.1 | 29 passed | 5 passed |
| Node 22.23.4 | ioredis 5.10.1 | 29 passed | 5 passed |

Earlier validation also covered the package's ESM/CJS/types, lint/build, package export checks, and focused single-node behavior. These are pre-fork validation results, not new GitHub Actions results or a claim that the entire upstream CI passed. The initial fork push reuses those results and does not run a new test matrix. This document changes no runtime code.

No claim is made here about managed AWS services, replica failover, durability across promotion, IAM rotation, capacity or an application's production readiness. A caller deadline does not guarantee cancellation or rollback of an operation already in flight.

## Distribution surface in 2.0.0

The npm distribution has its own name, `@gabbrieu/nextjs-cache-handler`, and version `2.0.0`. Root imports resolve to `/incremental`. Only incremental caching, client helpers, metrics and package metadata are exposed. The inherited plural, CLI, seed, MCP, agent rules and setup recipes remain in the source repository but are not built or published in this package.

The inherited CLI's original namespace cannot accidentally wire a consumer through this distribution because no CLI binary or automatic setup payload is shipped. No consumer application is changed by installing this library. The source algorithm of the reviewed incremental/client patch is preserved.

The old lockfile had upstream root identity `0.4.0` and a root dependency on the upstream package that did not match package.json. The fork's root identity is now synchronized, the stale self-dependency is removed, and existing dependency versions/resolved URLs/integrities are preserved.

Registry publication status is established by the registry version and integrity, not by a version field in Git. A source branch or locally verified tarball does not imply publication or registry authorization. Distribution validation can be run with `npm run verify:release`; publication requires an account with rights to the scope.

The confirmed-invalidation patch intentionally changes the soft-error contract. The previous pending changeset is represented in the 2.0.0 changelog rather than being applied a second time. Source revision, package identity and integrity must be recorded for a release.

## License and upstream

Keep the original copyright and MIT permission notice in [LICENSE](LICENSE). Upstream: <https://github.com/leejpsd/nextjs-cache-handler>. No upstream pull request, issue comment or package publication is part of this fork-creation step.