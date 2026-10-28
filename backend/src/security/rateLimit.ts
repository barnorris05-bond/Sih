/**
 * Small in-memory failure limiter for credential endpoints.
 *
 * Only *failed* attempts count, so legitimate users and demos that sign in repeatedly are never
 * throttled; repeated failures from the same source are. Memory is bounded: expired entries are pruned
 * on access and the key table is capped (oldest keys are evicted first).
 */
export interface LimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

export class FailureLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly maxFailures: number,
    private readonly windowMs: number,
    private readonly maxKeys = 5_000,
  ) {}

  private recent(key: string, now: number): number[] {
    const stamps = this.hits.get(key);
    if (!stamps) return [];
    const fresh = stamps.filter((stamp) => now - stamp < this.windowMs);
    if (fresh.length === 0) this.hits.delete(key);
    else if (fresh.length !== stamps.length) this.hits.set(key, fresh);
    return fresh;
  }

  check(key: string, now = Date.now()): LimitDecision {
    const stamps = this.recent(key, now);
    if (stamps.length < this.maxFailures) return { allowed: true, retryAfterSeconds: 0 };
    const oldest = stamps[0] ?? now;
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000)) };
  }

  recordFailure(key: string, now = Date.now()): void {
    const stamps = this.recent(key, now);
    stamps.push(now);
    // Re-insert so the most recently active key is evicted last.
    this.hits.delete(key);
    this.hits.set(key, stamps);
    while (this.hits.size > this.maxKeys) {
      const oldest = this.hits.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.hits.delete(oldest);
    }
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  get size(): number {
    return this.hits.size;
  }
}

/** Normalises the account part of a throttle key so case/whitespace variants share one counter. */
export function accountKey(email: string): string {
  return email.trim().toLowerCase().slice(0, 254);
}

const globalForLimiter = globalThis as unknown as {
  __aicteLoginLimiters?: { perAccount: FailureLimiter; perSource: FailureLimiter };
};

/**
 * Failed-login limits, per 5 minutes:
 * - `perAccount` (8): keyed by the account alone. It is the control that always works, because it needs
 *   no network identity — rotating or forging addresses cannot reset it.
 * - `perSource` (30): keyed by the caller's address, and only used when the address is known and
 *   trustworthy (see clientAddress in the frontend). It is an extra layer, never the only one.
 */
export function loginLimiters(): { perAccount: FailureLimiter; perSource: FailureLimiter } {
  if (!globalForLimiter.__aicteLoginLimiters) {
    globalForLimiter.__aicteLoginLimiters = {
      perAccount: new FailureLimiter(8, 5 * 60_000, 10_000),
      perSource: new FailureLimiter(30, 5 * 60_000, 10_000),
    };
  }
  return globalForLimiter.__aicteLoginLimiters;
}
