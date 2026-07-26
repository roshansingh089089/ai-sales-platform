import assert from "node:assert/strict";
import { test } from "node:test";
import { BrowserPool } from "./BrowserPool.js";

test("BrowserPool reuses released browser sessions", async () => {
  const pool = new BrowserPool(1, 60_000);
  const first = await pool.acquire();
  const id = first.browserSessionId;
  await first.release();
  const second = await pool.acquire();

  assert.equal(second.browserSessionId, id);
  assert.equal(pool.status().launches, 1);
  assert.equal(pool.status().reuses, 1);
});

test("BrowserPool enforces maximum instances", async () => {
  const pool = new BrowserPool(1, 60_000);
  await pool.acquire();

  await assert.rejects(() => pool.acquire(), /Browser pool is exhausted/);
});
