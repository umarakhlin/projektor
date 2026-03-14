import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const membership = await prisma.membership.findFirst({
    where: { projectId, userId: session.user.id }
  });
  const isOwner = project.ownerId === session.user.id;
  if (!isOwner && !membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { projectId },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
    take: 200
  });

  return NextResponse.json(messages);
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
      { error: "Message is required" },
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
      { error: "Only project members can chat" },
      { status: 403 }
    );
  }

  const message = await prisma.chatMessage.create({
    data: {
      projectId,
      authorId: session.user.id,
      content: content.trim()
    },
    include: { author: { select: { id: true, name: true } } }
  });

  return NextResponse.json(message);
}
