import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    include: {
      project: { include: { roles: true } },
      role: true
    },
    orderBy: { joinedAt: "desc" }
  });

  return NextResponse.json(
    memberships.map((m) => ({
      project: m.project,
      role: m.role
    }))
  );
}
