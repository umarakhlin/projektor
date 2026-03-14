import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = getRateLimitKey(session.user.id, "report");
  const { ok } = rateLimit(key, 10, 60_000); // 10 reports per minute
  if (!ok) {
    return NextResponse.json(
      { error: "Too many reports. Please try again later." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const { targetType, targetId, reason } = body as {
    targetType?: string;
    targetId?: string;
    reason?: string;
  };

  if (!targetType || !targetId) {
    return NextResponse.json(
      { error: "targetType and targetId are required" },
      { status: 400 }
    );
  }

  if (targetType !== "Project" && targetType !== "User") {
    return NextResponse.json(
      { error: "targetType must be Project or User" },
      { status: 400 }
    );
  }

  const report = await prisma.report.create({
    data: {
      reporterId: session.user.id,
      targetType: targetType as "Project" | "User",
      targetId,
      reason: reason?.trim() || null,
      status: "Pending"
    }
  });

  return NextResponse.json({ id: report.id, message: "Report submitted" });
}
