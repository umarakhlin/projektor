import { createHash } from "crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NDA_VERSION } from "@/lib/nda";

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

function pickIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip");
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const clientVersion =
    typeof body?.ndaVersion === "string" ? body.ndaVersion : NDA_VERSION;

  if (clientVersion !== NDA_VERSION) {
    return NextResponse.json(
      {
        error:
          "This NDA version is out of date. Please refresh the page and try again."
      },
      { status: 409 }
    );
  }

  const userAgentHeader = req.headers.get("user-agent");
  const userAgent =
    typeof userAgentHeader === "string"
      ? userAgentHeader.slice(0, 500)
      : null;

  const ipHash = hashIp(pickIp(req));
  const now = new Date();

  try {
    await prisma.$transaction([
      prisma.ndaAcceptance.create({
        data: {
          userId: session.user.id,
          ndaVersion: NDA_VERSION,
          agreedAt: now,
          ipHash,
          userAgent
        }
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { lastNdaAcceptedAt: now }
      })
    ]);
  } catch (err) {
    console.error("[nda] accept-nda transaction failed:", err);
    return NextResponse.json(
      { error: "Could not record acceptance." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    ndaVersion: NDA_VERSION,
    acceptedAt: now.toISOString()
  });
}
