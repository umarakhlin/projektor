import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Public projects (Recruiting, Active, Closed) - updates visible to all
  if (project.status === "Draft") {
    const session = await getServerSession(authOptions);
    const isMember = session?.user?.id
      ? await prisma.membership
          .findFirst({ where: { projectId, userId: session.user.id } })
          .then(Boolean)
      : false;
    if (session?.user?.id !== project.ownerId && !isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const updates = await prisma.update.findMany({
    where: { projectId },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return NextResponse.json(updates);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const body = await req.json();
  const { content } = body as { content?: string };

  if (!content?.trim()) {
    return NextResponse.json(
      { error: "Content is required" },
      { status: 400 }
    );
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const membership = await prisma.membership.findFirst({
    where: { projectId, userId: session.user.id }
  });
  const isOwner = project.ownerId === session.user.id;

  if (!isOwner && !membership) {
    return NextResponse.json(
      { error: "Only project members can post updates" },
      { status: 403 }
    );
  }

  const update = await prisma.update.create({
    data: {
      projectId,
      authorId: session.user.id,
      content: content.trim()
    },
    include: { author: { select: { id: true, name: true } } }
  });

  return NextResponse.json(update);
}
