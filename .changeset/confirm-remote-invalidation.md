---
"@leejpsd/nextjs-cache-handler": major
---

Require confirmed remote marker writes for singular cache invalidation, including
soft invalidation. Connection failures, reconnect cooldowns, rejected writes and
deadlines reject the caller instead of reporting successful remote invalidation.
This intentionally changes the soft-error contract; entry reads/writes and explicit
local/build-only paths retain their fallback behavior.

Wait for auto-connecting ioredis factories to become ready before admitting the
client, and clean up listeners on readiness, failure or a bounded wait timeout.
Expose cluster ACL username, full TLS options, DNS lookup and connection/command/
discovery limits while preserving ioredis's connection timeout when unspecified.
