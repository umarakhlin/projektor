import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const MODERATOR_EMAILS = (process.env.MODERATOR_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isModerator(email: string | null | undefined): boolean {
  if (!email) return false;
  return MODERATOR_EMAILS.includes(email.toLowerCase());
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isModerator(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const reports = await prisma.report.findMany({
    where: { status: "Pending" },
    include: { reporter: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(reports);
}
