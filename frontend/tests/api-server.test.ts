import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_BODY_BYTES, RequestError, clientAddress, handleRouteError, readJsonBody } from "../src/lib/api-server";

const post = (body: string, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/x", { method: "POST", body, headers: { "content-type": "application/json", ...headers } });

test("parses well-formed JSON", async () => {
  assert.deepEqual(await readJsonBody(post('{"a":1}')), { a: 1 });
});

test("malformed JSON is a 400 client error, not a 500", async () => {
  await assert.rejects(readJsonBody(post("{not json")), (error: unknown) => error instanceof RequestError && error.status === 400 && error.code === "INVALID_JSON");
  const response = handleRouteError(new RequestError("Request body must be valid JSON.", 400, "INVALID_JSON"));
  assert.equal(response.status, 400);
});

test("oversized bodies are rejected with 413 (declared and undeclared length)", async () => {
  await assert.rejects(readJsonBody(post("{}", { "content-length": String(MAX_BODY_BYTES + 1) })), (error: unknown) => error instanceof RequestError && error.status === 413);
  const big = JSON.stringify({ pad: "x".repeat(MAX_BODY_BYTES) });
  await assert.rejects(readJsonBody(post(big)), (error: unknown) => error instanceof RequestError && error.status === 413);
});

const withXff = (value?: string) => new Request("http://x", { headers: value ? { "x-forwarded-for": value } : {} });

test("forwarded headers are ignored by default: a client cannot choose its own identity", () => {
  assert.equal(clientAddress(withXff("203.0.113.7"), undefined), null);
  assert.equal(clientAddress(withXff("203.0.113.7, 198.51.100.9"), ""), null);
  assert.equal(clientAddress(withXff("203.0.113.7"), "0"), null);
});

test("behind N trusted proxies the address is the Nth entry from the RIGHT; client-supplied entries to its left are ignored", () => {
  // The client sent "6.6.6.6"; the single trusted proxy appended the address it actually saw.
  assert.equal(clientAddress(withXff("6.6.6.6, 198.51.100.9"), "1"), "198.51.100.9");
  assert.equal(clientAddress(withXff("1.1.1.1, 2.2.2.2, 198.51.100.9"), "1"), "198.51.100.9");
  // Two trusted hops (CDN -> load balancer): the real client is one further left.
  assert.equal(clientAddress(withXff("6.6.6.6, 203.0.113.50, 10.0.0.2"), "2"), "203.0.113.50");
  // A spoofed leftmost value never changes the result.
  assert.equal(clientAddress(withXff("9.9.9.9, 198.51.100.9"), "1"), clientAddress(withXff("8.8.8.8, 198.51.100.9"), "1"));
});

test("missing, short, malformed or mis-configured forwarding information yields null (never a guess)", () => {
  assert.equal(clientAddress(withXff(), "1"), null);
  assert.equal(clientAddress(withXff("198.51.100.9"), "2"), null, "fewer entries than trusted hops");
  assert.equal(clientAddress(withXff("<script>alert(1)</script>"), "1"), null);
  assert.equal(clientAddress(withXff("a".repeat(100)), "1"), null);
  for (const bad of ["abc", "-1", "1.5", "11", "NaN"]) assert.equal(clientAddress(withXff("198.51.100.9"), bad), null, bad);
  assert.equal(clientAddress(withXff("2001:db8::1"), "1"), "2001:db8::1", "IPv6 is accepted");
});
