/** @jest-environment node */

import { PATCH } from "@/app/api/offers/[id]/route";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn()
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {}
}));

jest.mock("@/lib/metrics", () => ({
  track: jest.fn()
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    offer: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    application: {
      update: jest.fn()
    },
    membership: {
      create: jest.fn()
    },
    role: {
      update: jest.fn(),
      findUnique: jest.fn()
    },
    $transaction: jest.fn()
  }
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

describe("PATCH /api/offers/[id] accept", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });

    (prisma.offer.findUnique as jest.Mock).mockResolvedValue({
      id: "offer-1",
      status: "Offered",
      applicationId: "app-1",
      application: {
        id: "app-1",
        applicantId: "user-1",
        role: {
          id: "role-1",
          openings: 1,
          filledCount: 0,
          project: { id: "proj-1" }
        }
      }
    });

    (prisma.offer.update as jest.Mock).mockResolvedValue({});
    (prisma.application.update as jest.Mock).mockResolvedValue({});
    (prisma.membership.create as jest.Mock).mockResolvedValue({});
    (prisma.role.update as jest.Mock).mockResolvedValue({});
    (prisma.$transaction as jest.Mock).mockResolvedValue([]);
    (prisma.role.findUnique as jest.Mock).mockResolvedValue({
      id: "role-1",
      openings: 1,
      filledCount: 1
    });
  });

  it("accepts offer and creates membership", async () => {
    const req = new Request("http://localhost/api/offers/offer-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept" })
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "offer-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, projectId: "proj-1" });
    expect(prisma.membership.create).toHaveBeenCalledWith({
      data: { userId: "user-1", projectId: "proj-1", roleId: "role-1" }
    });
  });

  it("returns 401 when unauthenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce(null);
    const req = new Request("http://localhost/api/offers/offer-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "accept" })
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "offer-1" }) });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 403 when offer belongs to different user", async () => {
    (prisma.offer.findUnique as jest.Mock).mockResolvedValueOnce({
      id: "offer-1",
      status: "Offered",
      applicationId: "app-1",
      application: {
        id: "app-1",
        applicantId: "other-user",
        role: { id: "role-1", openings: 1, filledCount: 0, project: { id: "proj-1" } }
      }
    });
    const req = new Request("http://localhost/api/offers/offer-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "accept" })
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "offer-1" }) });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({ error: "Forbidden" });
  });

  it("returns 404 when offer is not found", async () => {
    (prisma.offer.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const req = new Request("http://localhost/api/offers/missing", {
      method: "PATCH",
      body: JSON.stringify({ action: "accept" })
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "missing" }) });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({ error: "Offer not found" });
  });

  it("returns 400 when offer has already been responded to", async () => {
    (prisma.offer.findUnique as jest.Mock).mockResolvedValueOnce({
      id: "offer-1",
      status: "Accepted",
      applicationId: "app-1",
      application: {
        id: "app-1",
        applicantId: "user-1",
        role: { id: "role-1", openings: 1, filledCount: 0, project: { id: "proj-1" } }
      }
    });
    const req = new Request("http://localhost/api/offers/offer-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "accept" })
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "offer-1" }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: "Offer has already been responded to" });
  });

  it("returns 400 when role has no open slots", async () => {
    (prisma.offer.findUnique as jest.Mock).mockResolvedValueOnce({
      id: "offer-1",
      status: "Offered",
      applicationId: "app-1",
      application: {
        id: "app-1",
        applicantId: "user-1",
        role: { id: "role-1", openings: 1, filledCount: 1, project: { id: "proj-1" } }
      }
    });
    const req = new Request("http://localhost/api/offers/offer-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "accept" })
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "offer-1" }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: "This role is no longer open" });
  });

  it("handles decline action", async () => {
    const req = new Request("http://localhost/api/offers/offer-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "decline" })
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "offer-1" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(prisma.membership.create).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("returns 400 on invalid action (idempotency-safe current behavior)", async () => {
    const req = new Request("http://localhost/api/offers/offer-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "noop" })
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "offer-1" }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: "Invalid action" });
  });
});
