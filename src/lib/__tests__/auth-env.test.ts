/** @jest-environment node */

jest.mock("next-auth", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    GET: jest.fn(),
    POST: jest.fn()
  }))
}));

jest.mock("next-auth/providers/credentials", () => ({
  __esModule: true,
  default: jest.fn((config) => config)
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn()
    }
  }
}));

describe("auth env fail-fast guard", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("throws on missing NEXTAUTH_SECRET and invalid NEXTAUTH_URL", () => {
    delete process.env.NEXTAUTH_SECRET;
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    expect(() => {
      require("@/lib/auth");
    }).toThrow(/NEXTAUTH_SECRET/);

    jest.resetModules();
    process.env.NEXTAUTH_SECRET = "test-secret";
    process.env.NEXTAUTH_URL = "not-a-url";
    expect(() => {
      require("@/lib/auth");
    }).toThrow(/Invalid NEXTAUTH_URL/);
  });

  it("throws on NEXTAUTH_URL protocol other than http/https", () => {
    process.env.NEXTAUTH_SECRET = "test-secret";
    process.env.NEXTAUTH_URL = "ftp://localhost:3000";

    expect(() => {
      require("@/lib/auth");
    }).toThrow(/protocol.*http:\/\/ or https:\/\//i);
  });
});
