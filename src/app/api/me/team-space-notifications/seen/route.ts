import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { parseJsonObject } from "@/lib/safe-json";

type TeamSpaceLastSeenMap = Record<string, string>;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { projectId?: string };
  const projectId = body?.projectId;
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const [project, membership, user] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true }
    }),
    prisma.membership.findFirst({
      where: { projectId, userId: session.user.id },
      select: { id: true }
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { settings: true }
    })
  ]);

  const canAccess = !!project && (project.ownerId === session.user.id || !!membership);
  if (!canAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = parseJsonObject<{ teamSpaceLastSeen?: TeamSpaceLastSeenMap }>(
    user?.settings,
    {}
  );
  const teamSpaceLastSeen = { ...(settings.teamSpaceLastSeen ?? {}) };
  teamSpaceLastSeen[projectId] = new Date().toISOString();

  const nextSettings = { ...settings, teamSpaceLastSeen };
  await prisma.user.update({
    where: { id: session.user.id },
    data: { settings: JSON.stringify(nextSettings) }
  });

  return NextResponse.json({ ok: true });
}

