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

## Distribution status

No package release has been published from this fork. `package.json` still contains the upstream package name and version; version `1.0.0` alone does not identify this patched source or the upstream registry artifact. Identify this source by commit SHA.

A fork package release needs a separately reviewed namespace/version/registry, release workflow and CLI/scaffolding identity. The inherited CLI still generates imports of the upstream package. Do not run it against a consumer application or publish using inherited package metadata without that separate work. Upstream README badges and instructions below the fork notice are retained historical upstream documentation, not this fork's CI status or qualification.

The soft invalidation error contract intentionally changes when confirmation fails; the existing changeset proposes a major release for the upstream package. Any fork release must document that compatibility change. Maintenance and distribution qualification remain separate from creating this source fork.

## License and upstream

Keep the original copyright and MIT permission notice in [LICENSE](LICENSE). Upstream: <https://github.com/leejpsd/nextjs-cache-handler>. No upstream pull request, issue comment or package publication is part of this fork-creation step.