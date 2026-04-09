import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { issueEmailVerificationToken } from "@/lib/email-verification";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, emailVerifiedAt: true }
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (user.emailVerifiedAt) {
    return NextResponse.json({ error: "Email already verified" }, { status: 400 });
  }

  const origin = req.headers.get("origin");
  const verificationUrl = await issueEmailVerificationToken(user.id, origin);
  return NextResponse.json({ verificationUrl });
}
