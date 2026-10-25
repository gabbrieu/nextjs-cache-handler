# gabbrieu incremental cache fork

This repository preserves the upstream source layout, but the `@gabbrieu/nextjs-cache-handler` npm distribution is incremental-only. The plural provider retained by the accompanying evaluation is `@flefebvre/nextjs-redis-cache-handler@0.1.0`.

- Read README.md and FORK_NOTES.md for the public surface, source identity, historical validation and limits. Root imports resolve to `/incremental`; the inherited plural, CLI, seed, MCP and automatic setup recipes are not published.
- Keep the reviewed incremental/client algorithm unchanged unless a separately identified risk or request requires a delta. Reuse unchanged proofs and validate only new source/artifact/configuration risk. Do not claim a new full CI result from historical tests.
- Preserve the original MIT notices. Avoid unrelated refactoring, a new cache framework/adapter or automatically wiring a consumer application.
- Package identity, exports, build entries, lockfile and installed tarball must agree. `npm run verify:release` checks types/build/package shape and an isolated consumer; its temporary directories must remain scoped to the fixture created by that script.
- The inherited source folders under `src/cache-components`, `src/cli`, `skills`, `rules`, `setup-instructions` and `mcp` are retained for source traceability. They are not qualified instructions for this distribution and must not be selected, published or executed against an application by inference.
- Never include registry credentials, authentication codes, private environment files, cache data or consumer evidence in a package or commit.
- Publish only an explicitly requested version to the intended registry using an account with verified scope permissions. Publishing approval does not grant registry rights. Do not change organization membership, account security or a consumer application's code/configuration without the corresponding authorization.
- The manual release-candidate workflow builds an artifact only. It does not publish or manage registry credentials. Future automation/trusted publishing requires its own configuration and qualification.
