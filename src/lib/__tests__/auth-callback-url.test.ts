/** @jest-environment node */

import { resolveAuthCallbackUrl } from "@/lib/auth-callback-url";

describe("resolveAuthCallbackUrl", () => {
  const origin = "http://localhost:3000";

  it("accepts same-origin absolute callback url", () => {
    expect(resolveAuthCallbackUrl("http://localhost:3000/create", origin)).toBe(
      "http://localhost:3000/create"
    );
  });

  it("accepts relative callback path", () => {
    expect(resolveAuthCallbackUrl("/inbox?tab=offers", origin)).toBe(
      "http://localhost:3000/inbox?tab=offers"
    );
  });

  it("falls back to home for invalid or cross-origin callback url", () => {
    expect(resolveAuthCallbackUrl("not-a-url", origin)).toBe(
      "http://localhost:3000/"
    );
    expect(resolveAuthCallbackUrl("https://evil.example/steal", origin)).toBe(
      "http://localhost:3000/"
    );
  });

  it("falls back to home when callback points to sign-in route", () => {
    expect(resolveAuthCallbackUrl("/auth/signin", origin)).toBe(
      "http://localhost:3000/"
    );
  });
});
