import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, verifyPassword, verifyPasswordAsync } from "../src/auth/password";

test("async verification accepts the correct password and rejects wrong ones", async () => {
  const encoded = hashPassword("correct horse");
  assert.equal(await verifyPasswordAsync("correct horse", encoded), true);
  assert.equal(await verifyPasswordAsync("wrong", encoded), false);
  assert.equal(await verifyPasswordAsync("", encoded), false);
});

test("async and sync verification agree (same scheme and cost)", async () => {
  const encoded = hashPassword("parity");
  for (const candidate of ["parity", "Parity", "parity "]) {
    assert.equal(await verifyPasswordAsync(candidate, encoded), verifyPassword(candidate, encoded));
  }
});

test("malformed stored hashes are rejected, not thrown", async () => {
  assert.equal(await verifyPasswordAsync("x", "not-a-hash"), false);
  assert.equal(await verifyPasswordAsync("x", "scrypt$zz$"), false);
  assert.equal(await verifyPasswordAsync("x", "bcrypt$aa$bb"), false);
});

/** Largest gap between 2 ms timer ticks while `work` runs: a direct measure of event-loop blocking. */
async function maxLoopLag(work: () => Promise<unknown> | unknown): Promise<number> {
  let last = performance.now();
  let max = 0;
  const timer = setInterval(() => {
    const now = performance.now();
    max = Math.max(max, now - last);
    last = now;
  }, 2);
  try {
    await work();
    // A fully blocked loop never gets to tick, so also count the gap since the last tick.
    max = Math.max(max, performance.now() - last);
  } finally {
    clearInterval(timer);
  }
  return max;
}

test("async verification does not block the event loop the way scryptSync does", async () => {
  const encoded = hashPassword("lag");
  const syncLag = await maxLoopLag(async () => {
    await new Promise((resolve) => setImmediate(resolve));
    for (let i = 0; i < 4; i += 1) verifyPassword("lag", encoded);
  });
  const asyncLag = await maxLoopLag(() => Promise.all(Array.from({ length: 4 }, () => verifyPasswordAsync("lag", encoded))));
  // Four serial scryptSync calls stall the loop for their combined duration; the async path stays responsive.
  assert.ok(asyncLag < syncLag / 2, `async lag ${asyncLag.toFixed(1)}ms should be well below sync lag ${syncLag.toFixed(1)}ms`);
});
