/** @jest-environment node */

import { validateAuthEnv, validateDatabaseEnv } from "@/lib/auth-env";

describe("launch env validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("fails when DATABASE_URL is missing", () => {
    delete process.env.DATABASE_URL;
    expect(() => validateDatabaseEnv()).toThrow(/DATABASE_URL/);
  });

  it("fails when DATABASE_URL is a placeholder", () => {
    process.env.DATABASE_URL = "replace-with-postgres-url";
    expect(() => validateDatabaseEnv()).toThrow(/placeholder/i);
  });

  it("passes when required launch env vars are set", () => {
    process.env.DATABASE_URL = "file:./dev.db";
    process.env.NEXTAUTH_SECRET = "test-secret";
    process.env.NEXTAUTH_URL = "http://localhost:3000";

    expect(validateDatabaseEnv()).toBe("file:./dev.db");
    expect(validateAuthEnv()).toBe("test-secret");
  });
});
