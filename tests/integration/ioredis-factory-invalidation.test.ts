/** Run against a disposable local Redis using the existing integration config. */
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";

import Redis from "ioredis";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createIncrementalCacheHandler } from "../../src/incremental/index.js";
import { adaptIoredis } from "../../src/shared/client/adapter-ioredis.js";

import { getRedisUrl } from "./_redis-helpers.js";

describe("auto-connecting ioredis factory invalidation", () => {
  const prefix = `factory-regression:${randomUUID()}:`;
  const clients: Redis[] = [];
  const keys: string[] = [];
  let control: Redis;

  beforeAll(async () => {
    control = new Redis(getRedisUrl(), { lazyConnect: true, retryStrategy: () => null });
    control.on("error", () => {});
    await control.connect();
    expect(await control.ping()).toBe("PONG");
  });
  afterEach(async () => {
    for (const client of clients.splice(0)) client.disconnect();
    if (keys.length) await control.del(...keys.splice(0));
  });
  afterAll(() => control?.disconnect());

  it.each([undefined, { expire: 0 }, {}])(
    "waits for the factory's initial connection and confirms both writes (%j)",
    async (durations) => {
      let creations = 0;
      const Handler = createIncrementalCacheHandler({
        client: () => {
          const client = new Redis(getRedisUrl(), { retryStrategy: () => null });
          client.on("error", () => {});
          clients.push(client);
          creations++;
          return adaptIoredis(client);
        },
        keyPrefix: prefix,
        buildNamespace: "test",
        fallback: "never",
        isBuildPhase: () => false,
        abortTimeoutMs: 3000,
      });
      const handler = new Handler();
      const tags = [randomUUID(), randomUUID()];
      keys.push(...tags.map((tag) => `${prefix}tag:${tag}`));
      await Promise.all(tags.map((tag) => handler.revalidateTag(tag, durations)));
      expect(creations).toBe(1);
      for (const key of keys) {
        const marker = JSON.parse((await control.get(key))!);
        if (durations && durations.expire === undefined) {
          expect(marker.stale).toBeTypeOf("number");
          expect(marker.expired).toBeUndefined();
        } else {
          expect(marker.expired).toBeTypeOf("number");
        }
      }
    }
  );

  it("rejects a failed auto-connection without reporting a remote acknowledgement", async () => {
    // Reserve/release a loopback port; never aim the negative at another service.
    const reserved = createServer();
    await new Promise<void>((resolve, reject) => {
      reserved.once("error", reject);
      reserved.listen(0, "127.0.0.1", resolve);
    });
    const address = reserved.address();
    if (!address || typeof address === "string") throw new Error("Expected loopback port");
    await new Promise<void>((resolve, reject) =>
      reserved.close((e) => (e ? reject(e) : resolve()))
    );
    const metrics: string[] = [];
    const Handler = createIncrementalCacheHandler({
      client: () => {
        const client = new Redis({
          host: "127.0.0.1",
          port: address.port,
          retryStrategy: () => null,
        });
        client.on("error", () => {});
        clients.push(client);
        return adaptIoredis(client);
      },
      keyPrefix: prefix,
      fallback: "never",
      isBuildPhase: () => false,
      abortTimeoutMs: 3000,
      onMetric: (event) => {
        if (event.type.startsWith("tag.invalidate") && event.meta?.backend === "redis") {
          metrics.push(event.type);
        }
      },
    });
    await expect(new Handler().revalidateTag("unavailable", { expire: 0 })).rejects.toThrow();
    expect(metrics).toEqual([]);
  });
});
