/** @jest-environment node */

import { POST } from "@/app/api/applications/route";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn()
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {}
}));

jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn(() => ({ ok: true })),
  getRateLimitKey: jest.fn(() => "apply:user-1")
}));

jest.mock("@/lib/metrics", () => ({
  track: jest.fn()
}));

jest.mock("@/lib/email", () => ({
  sendEmail: jest.fn(() => Promise.resolve())
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    role: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    application: {
      findFirst: jest.fn(),
      create: jest.fn()
    },
    user: {
      findUnique: jest.fn()
    }
  }
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { track } from "@/lib/metrics";
import { sendEmail } from "@/lib/email";

describe("POST /api/applications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.role.findUnique as jest.Mock).mockResolvedValue({
      id: "role-1",
      title: "Developer",
      state: "Open",
      project: { id: "proj-1", title: "Project", status: "Recruiting", ownerId: "owner-1" }
    });
    (prisma.application.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.application.create as jest.Mock).mockResolvedValue({
      id: "app-1",
      applicationId: "app-1",
      role: { project: { id: "proj-1", title: "Project", ownerId: "owner-1" } },
      applicant: { id: "user-1", name: "User", email: "user@test.com" }
    });
    (prisma.role.update as jest.Mock).mockResolvedValue({});
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ email: "owner@test.com" });
  });

  it("creates application on happy path", async () => {
    const req = new Request("http://localhost/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roleId: "role-1",
        message: " Hello ",
        links: [{ url: "https://example.com" }],
        availability: " evenings "
      })
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe("app-1");
    expect(prisma.application.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          roleId: "role-1",
          applicantId: "user-1",
          message: "Hello",
          links: JSON.stringify([{ url: "https://example.com" }]),
          availability: "evenings",
          status: "Applied"
        })
      })
    );
  });

  it("returns 400 for invalid payload without roleId", async () => {
    const req = new Request("http://localhost/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "No role id"
      })
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: "Role ID is required" });
    expect(prisma.role.findUnique).not.toHaveBeenCalled();
    expect(prisma.application.create).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const req = new Request("http://localhost/api/applications", {
      method: "POST",
      body: JSON.stringify({ roleId: "role-1" })
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 429 when rate limit is exceeded", async () => {
    (rateLimit as jest.Mock).mockReturnValueOnce({ ok: false });
    const req = new Request("http://localhost/api/applications", {
      method: "POST",
      body: JSON.stringify({ roleId: "role-1" })
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body).toEqual({ error: "Too many applications. Try again later." });
  });

  it("returns 404 when role is not found", async () => {
    (prisma.role.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const req = new Request("http://localhost/api/applications", {
      method: "POST",
      body: JSON.stringify({ roleId: "missing-role" })
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({ error: "Role not found" });
  });

  it("returns 400 when role project is not recruiting", async () => {
    (prisma.role.findUnique as jest.Mock).mockResolvedValueOnce({
      id: "role-1",
      title: "Developer",
      state: "Open",
      project: { id: "proj-1", title: "Project", status: "Active", ownerId: "owner-1" }
    });
    const req = new Request("http://localhost/api/applications", {
      method: "POST",
      body: JSON.stringify({ roleId: "role-1" })
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: "Project is not accepting applications" });
  });

  it("returns 400 when role is filled", async () => {
    (prisma.role.findUnique as jest.Mock).mockResolvedValueOnce({
      id: "role-1",
      title: "Developer",
      state: "Filled",
      project: { id: "proj-1", title: "Project", status: "Recruiting", ownerId: "owner-1" }
    });
    const req = new Request("http://localhost/api/applications", {
      method: "POST",
      body: JSON.stringify({ roleId: "role-1" })
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: "This role is no longer open" });
  });

  it("returns 409 when duplicate active application exists", async () => {
    (prisma.application.findFirst as jest.Mock).mockResolvedValueOnce({ id: "app-existing" });
    const req = new Request("http://localhost/api/applications", {
      method: "POST",
      body: JSON.stringify({ roleId: "role-1" })
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body).toEqual({ error: "You have already applied to this role" });
  });

  it("returns 400 when request json is malformed and does not write", async () => {
    const badReq = {
      json: jest.fn().mockRejectedValue(new Error("invalid json"))
    } as unknown as Request;

    const res = await POST(badReq);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: "Invalid JSON body" });
    expect(prisma.application.create).not.toHaveBeenCalled();
    expect(prisma.role.update).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("stores links as null when links is not an array", async () => {
    const req = new Request("http://localhost/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roleId: "role-1",
        links: { url: "https://example.com" }
      })
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(prisma.application.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          links: null
        })
      })
    );
  });
});
