import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { parseJsonObject } from "@/lib/safe-json";

type UserSettings = { avatarUrl?: string };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const me = session.user.id;
  const { userId: partnerId } = await params;

  if (!partnerId || partnerId === me) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }

  const partner = await prisma.user.findUnique({
    where: { id: partnerId },
    select: { id: true, name: true, email: true, settings: true }
  });
  if (!partner) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const rows = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: me, recipientId: partnerId },
        { senderId: partnerId, recipientId: me }
      ]
    },
    orderBy: { createdAt: "asc" },
    take: 500
  });

  const unreadIncoming = rows.filter(
    (m) => m.recipientId === me && !m.readAt
  );
  if (unreadIncoming.length > 0) {
    await prisma.directMessage.updateMany({
      where: { id: { in: unreadIncoming.map((m) => m.id) } },
      data: { readAt: new Date() }
    });
  }

  const settings = parseJsonObject<UserSettings>(partner.settings, {});

  const messages = rows.map((m) => ({
    id: m.id,
    content: m.content,
    createdAt: m.createdAt,
    readAt: m.senderId === me ? m.readAt : new Date().toISOString(),
    direction: m.senderId === me ? "out" : "in"
  }));

  return NextResponse.json({
    partner: {
      id: partner.id,
      name: partner.name,
      avatarUrl: settings.avatarUrl ?? null
    },
    messages
  });
}
