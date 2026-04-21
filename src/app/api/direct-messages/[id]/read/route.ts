import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const message = await prisma.directMessage.findUnique({
    where: { id },
    select: { id: true, recipientId: true, readAt: true }
  });
  if (!message || message.recipientId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!message.readAt) {
    await prisma.directMessage.update({
      where: { id },
      data: { readAt: new Date() }
    });
  }
  return NextResponse.json({ ok: true });
}
