# @gabbrieu/nextjs-cache-handler

Incremental Redis cache handler for self-hosted Next.js 15/16. This MIT-licensed fork contains the reviewed remote-invalidation confirmation and ioredis readiness/TLS/ACL corrections from [leejpsd/nextjs-cache-handler](https://github.com/leejpsd/nextjs-cache-handler).

The npm distribution is dedicated to the singular `cacheHandler` interface. The plural Cache Components provider is a separate dependency; the accompanying evaluation keeps `@flefebvre/nextjs-redis-cache-handler@0.1.0`. This package does not expose the inherited plural handler, CLI, seed command, MCP server or automatic setup recipes.

## Install

```sh
npm install @gabbrieu/nextjs-cache-handler@2.0.0 ioredis
```

Next.js must satisfy `>=15.0.0 <17` and Node.js must satisfy `>=20.0.0`. Install either `ioredis` or `redis` for the selected client; peer dependencies are not bundled into this package. Production runtime selection and lifecycle support remain the consumer's responsibility.

## Configure the incremental handler

Create a CommonJS wrapper, for example `cache-incremental.cjs`:

```js
const { createIncrementalCacheHandler } = require("@gabbrieu/nextjs-cache-handler/incremental");

const release = process.env.DEPLOYMENT_VERSION;
const redisUrl = process.env.REDIS_URL;
if (!release || !redisUrl) {
  throw new Error("DEPLOYMENT_VERSION and REDIS_URL are required");
}

module.exports = createIncrementalCacheHandler({
  client: { type: "ioredis", url: redisUrl },
  fallback: "never",
  buildNamespace: () => release,
  keyPrefix: `your-app:incremental:${release}:`,
});
```

Then reference the wrapper in the application's configuration:

```js
module.exports = {
  cacheHandler: require.resolve("./cache-incremental.cjs"),
  cacheMaxMemorySize: 0,
};
```

Provide the deployment namespace at runtime and use a namespace/prefix appropriate to the application's environment and release isolation requirements. Configure any plural `cacheHandlers` separately; this package does not generate or edit application files.

## Public entry points

- Root and `/incremental`: `createIncrementalCacheHandler`, `IncrementalRedisCacheHandler` and the incremental context type.
- `/client/redis` and `/client/ioredis`: client helpers inherited from the reviewed implementation.
- `/ops` and `/otel`: metric helpers; OpenTelemetry requires its optional peer when used.
- `/package.json`: distribution identity.

Root imports resolve directly to the incremental entry point. `/cache-components` and `/seed` are not public exports, and no CLI binary is installed. Their inherited source files remain in the GitHub repository for traceability rather than being published or qualified by this release.

## Invalidation and failure behavior

Invalidation that needs a remote marker write rejects when initialization, authentication, reconnect cooldown, command failure or the caller deadline prevents confirmation. This includes soft invalidation and intentionally changes the upstream error contract; the fork uses a new scope and major version.

Entry reads/writes and explicit local/build-only paths retain their documented fallback policies. A cache miss or a running Next.js process is not evidence of healthy distributed invalidation. Timeouts do not guarantee cancellation or rollback of commands already in flight.

Cluster configuration retains verified TLS identity and supports ACL username, full TLS options, DNS lookup and connection/command/discovery limits through the inherited client contract. Do not disable certificate verification to compensate for configuration problems. Managed-service compatibility, failover durability, IAM rotation and workload capacity require their own qualification.

## Validation and provenance

See [FORK_NOTES.md](FORK_NOTES.md) for the exact upstream base, reviewed patch identity, historical focused tests and their limits. Distribution checks are reproducible from the source repository with `npm run verify:release`; they build the package and install its tarball in an isolated consumer to check ESM/CJS imports and TypeScript resolution without starting a Redis or business service.

The repository and package metadata alone do not claim that every runtime, the entire upstream CI, or any production deployment has been validated. Registry version, integrity and source revision identify a particular published artifact.

## License

MIT. Preserve the original copyright and permission notice in [LICENSE](LICENSE). Original implementation by Eddy Lee; fork maintenance under [gabbrieu](https://github.com/gabbrieu/nextjs-cache-handler).
