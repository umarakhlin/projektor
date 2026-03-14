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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isModerator(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status } = body as { status?: string };

  if (status !== "Reviewed" && status !== "Resolved") {
    return NextResponse.json(
      { error: "status must be Reviewed or Resolved" },
      { status: 400 }
    );
  }

  const report = await prisma.report.update({
    where: { id },
    data: { status: status as "Reviewed" | "Resolved" }
  });

  return NextResponse.json(report);
}
