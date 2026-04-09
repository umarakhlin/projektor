import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { isModerator } from "@/lib/admin-auth";

type UpdateBody = {
  name?: string | null;
  emailVerified?: boolean;
};

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
  const body = (await req.json()) as UpdateBody;
  const nextName =
    body.name === undefined ? undefined : (body.name?.trim() || null);
  const nextVerifiedAt =
    body.emailVerified === undefined
      ? undefined
      : body.emailVerified
        ? new Date()
        : null;

  const updated = await prisma.user.update({
    where: { id },
    data: {
      name: nextName,
      emailVerifiedAt: nextVerifiedAt
    },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerifiedAt: true
    }
  });

  return NextResponse.json(updated);
}
