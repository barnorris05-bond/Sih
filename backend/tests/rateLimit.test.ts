import assert from "node:assert/strict";
import { test } from "node:test";
import { FailureLimiter, accountKey, loginLimiters } from "../src/security/rateLimit";

test("allows failures up to the limit, then blocks with a Retry-After", () => {
  const limiter = new FailureLimiter(3, 60_000);
  const t = 1_000_000;
  for (let i = 0; i < 3; i += 1) {
    assert.equal(limiter.check("k", t + i).allowed, true);
    limiter.recordFailure("k", t + i);
  }
  const decision = limiter.check("k", t + 10);
  assert.equal(decision.allowed, false);
  assert.ok(decision.retryAfterSeconds >= 59 && decision.retryAfterSeconds <= 60);
});

test("the window expires and keys are independent", () => {
  const limiter = new FailureLimiter(2, 1_000);
  limiter.recordFailure("a", 0);
  limiter.recordFailure("a", 10);
  assert.equal(limiter.check("a", 20).allowed, false);
  assert.equal(limiter.check("b", 20).allowed, true);
  assert.equal(limiter.check("a", 2_000).allowed, true);
  assert.equal(limiter.size, 0, "expired keys are pruned");
});

test("reset clears a key (successful sign-in)", () => {
  const limiter = new FailureLimiter(1, 60_000);
  limiter.recordFailure("a", 0);
  assert.equal(limiter.check("a", 1).allowed, false);
  limiter.reset("a");
  assert.equal(limiter.check("a", 2).allowed, true);
});

test("memory is bounded: the key table is capped and oldest keys are evicted", () => {
  const limiter = new FailureLimiter(5, 60_000, 100);
  for (let i = 0; i < 1_000; i += 1) limiter.recordFailure(`key-${i}`, i);
  assert.equal(limiter.size, 100);
  assert.equal(limiter.check("key-0", 2_000).allowed, true, "evicted key forgets its history");
});

test("account keys ignore case and surrounding whitespace so variants share one counter", () => {
  assert.equal(accountKey("  Admin@AICTE.demo "), "admin@aicte.demo");
  assert.equal(accountKey("a".repeat(400)).length, 254);
});

test("per-account throttling does not depend on the source: rotating addresses cannot reset it", () => {
  const { perAccount } = loginLimiters();
  const t = 5_000_000;
  const key = accountKey("victim@aicte.demo");
  // Eight failures, each "from a different address" -- the account counter never sees the address.
  for (let i = 0; i < 8; i += 1) perAccount.recordFailure(key, t + i);
  const decision = perAccount.check(accountKey("VICTIM@aicte.demo "), t + 10);
  assert.equal(decision.allowed, false);
  assert.ok(decision.retryAfterSeconds > 0 && decision.retryAfterSeconds <= 300);
  assert.equal(perAccount.check(accountKey("someone-else@aicte.demo"), t + 10).allowed, true);
  perAccount.reset(key);
});

test("the Retry-After shrinks as the window runs out and the account unlocks on time", () => {
  const limiter = new FailureLimiter(2, 60_000);
  limiter.recordFailure("k", 0);
  limiter.recordFailure("k", 1_000);
  assert.equal(limiter.check("k", 10_000).retryAfterSeconds, 50);
  assert.equal(limiter.check("k", 59_000).retryAfterSeconds, 1);
  assert.equal(limiter.check("k", 60_001).allowed, true);
});

test("an attacker spraying distinct keys cannot grow memory without bound", () => {
  const limiter = new FailureLimiter(8, 300_000, 10_000);
  for (let i = 0; i < 50_000; i += 1) limiter.recordFailure(`spray-${i}@x`, i);
  assert.equal(limiter.size, 10_000);
});
