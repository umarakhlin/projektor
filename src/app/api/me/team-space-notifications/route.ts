import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { parseJsonObject } from "@/lib/safe-json";

type TeamSpaceLastSeenMap = Record<string, string>;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [ownedProjects, memberships, user] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: session.user.id },
      select: { id: true }
    }),
    prisma.membership.findMany({
      where: { userId: session.user.id },
      select: { projectId: true }
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { settings: true }
    })
  ]);

  const projectIds = Array.from(
    new Set([
      ...ownedProjects.map((p) => p.id),
      ...memberships.map((m) => m.projectId)
    ])
  );

  if (projectIds.length === 0) {
    return NextResponse.json({ totalUnread: 0, byProject: [] });
  }

  const settings = parseJsonObject<{ teamSpaceLastSeen?: TeamSpaceLastSeenMap }>(
    user?.settings,
    {}
  );
  const lastSeenMap = settings.teamSpaceLastSeen ?? {};

  const messages = await prisma.chatMessage.findMany({
    where: {
      projectId: { in: projectIds },
      authorId: { not: session.user.id }
    },
    select: {
      id: true,
      projectId: true,
      createdAt: true
    },
    orderBy: { createdAt: "desc" },
    take: 1000
  });

  const byProjectCount: Record<string, number> = {};
  for (const msg of messages) {
    const lastSeenRaw = lastSeenMap[msg.projectId];
    const lastSeen = lastSeenRaw ? new Date(lastSeenRaw) : new Date(0);
    if (msg.createdAt > lastSeen) {
      byProjectCount[msg.projectId] = (byProjectCount[msg.projectId] ?? 0) + 1;
    }
  }

  const byProject = Object.entries(byProjectCount).map(([projectId, unread]) => ({
    projectId,
    unread
  }));

  const totalUnread = byProject.reduce((sum, p) => sum + p.unread, 0);
  return NextResponse.json({ totalUnread, byProject });
}

