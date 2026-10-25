import { EventEmitter } from "node:events";

import type { Cluster, Redis } from "ioredis";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { adaptCluster, adaptIoredis } from "../../src/shared/client/adapter-ioredis.js";

// Exercise the public adapter's event contract without opening sockets.
class StartingClient extends EventEmitter {
  status = "connecting";
  options = { connectTimeout: 50, redisOptions: { connectTimeout: 50 } };
  connect = vi.fn(async () => {
    this.status = "ready";
  });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe.each(["redis", "cluster"] as const)("ioredis readiness — %s", (kind) => {
  function setup() {
    const raw = new StartingClient();
    const client =
      kind === "cluster"
        ? adaptCluster(raw as unknown as Cluster)
        : adaptIoredis(raw as unknown as Redis);
    return { raw, client };
  }

  function expectClean(raw: StartingClient) {
    expect(raw.eventNames()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  }

  it.each(["connecting", "connect", "reconnecting"])(
    "waits for ready from %s without starting a parallel connect",
    async (status) => {
      const { raw, client } = setup();
      raw.status = status;
      const pending = client.connect();
      expect(raw.connect).not.toHaveBeenCalled();
      expect(client.isOpen).toBe(false);
      raw.status = "ready";
      raw.emit("ready");
      await pending;
      expect(client.isOpen).toBe(true);
      expectClean(raw);
    }
  );

  it.each(["wait", "end"])("starts a new connection from %s", async (status) => {
    const { raw, client } = setup();
    raw.status = status;
    await client.connect();
    expect(raw.connect).toHaveBeenCalledTimes(1);
    expect(client.isOpen).toBe(true);
    expectClean(raw);
  });

  it("does nothing when already ready", async () => {
    const { raw, client } = setup();
    raw.status = "ready";
    await client.connect();
    expect(raw.connect).not.toHaveBeenCalled();
    expectClean(raw);
  });

  it("preserves the connection error and removes its listeners", async () => {
    const { raw, client } = setup();
    const error = new Error("authentication rejected");
    const rejected = expect(client.connect()).rejects.toBe(error);
    raw.emit("error", error);
    await rejected;
    expectClean(raw);
  });

  it.each(["close", "end"])("rejects on %s before ready", async (event) => {
    const { raw, client } = setup();
    const rejected = expect(client.connect()).rejects.toThrow("closed before ready");
    raw.emit(event);
    await rejected;
    expectClean(raw);
  });

  it("bounds an attempt which never becomes ready", async () => {
    const { raw, client } = setup();
    const rejected = expect(client.connect()).rejects.toThrow("readiness timed out after 50ms");
    await vi.advanceTimersByTimeAsync(50);
    await rejected;
    expectClean(raw);
  });

  it("retains a finite readiness budget when socket timeouts are disabled", async () => {
    const { raw, client } = setup();
    raw.options.connectTimeout = 0;
    raw.options.redisOptions.connectTimeout = 0;
    const rejected = expect(client.connect()).rejects.toThrow("readiness timed out after 10000ms");
    await vi.advanceTimersByTimeAsync(10_000);
    await rejected;
    expectClean(raw);
  });
});
