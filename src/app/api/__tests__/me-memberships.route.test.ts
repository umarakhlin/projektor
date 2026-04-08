/** @jest-environment node */

import { GET } from "@/app/api/me/memberships/route";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn()
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {}
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    membership: {
      findMany: jest.fn()
    }
  }
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

describe("GET /api/me/memberships", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns authenticated memberships with project and role fields", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.membership.findMany as jest.Mock).mockResolvedValue([
      {
        project: { id: "proj-1", title: "Project One", roles: [{ id: "role-1", title: "Dev" }] },
        role: { id: "role-1", title: "Developer" }
      }
    ]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual([
      {
        project: { id: "proj-1", title: "Project One", roles: [{ id: "role-1", title: "Dev" }] },
        role: { id: "role-1", title: "Developer" }
      }
    ]);
  });

  it("returns 200 with empty array when user has no memberships", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.membership.findMany as jest.Mock).mockResolvedValue([]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual([]);
  });
});
