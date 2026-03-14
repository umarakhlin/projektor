import { rateLimit, getRateLimitKey } from "../rate-limit";

describe("rateLimit", () => {
  const key = "test-rate-" + Date.now();

  it("allows requests under the limit", () => {
    const first = rateLimit(key, 2, 60_000);
    expect(first.ok).toBe(true);
    expect(first.remaining).toBe(1);

    const second = rateLimit(key, 2, 60_000);
    expect(second.ok).toBe(true);
    expect(second.remaining).toBe(0);
  });

  it("rejects request over the limit", () => {
    const third = rateLimit(key, 2, 60_000);
    expect(third.ok).toBe(false);
    expect(third.remaining).toBe(0);
  });
});

describe("getRateLimitKey", () => {
  it("returns action:identifier", () => {
    expect(getRateLimitKey("user-1", "signup")).toBe("signup:user-1");
    expect(getRateLimitKey("abc", "apply")).toBe("apply:abc");
  });
});
