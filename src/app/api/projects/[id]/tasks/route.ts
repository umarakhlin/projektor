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

  const session = await getServerSession(authOptions);
  const isMember = session?.user?.id
    ? await prisma.membership
        .findFirst({ where: { projectId, userId: session.user.id } })
        .then(Boolean)
    : false;
  const isOwner = session?.user?.id === project.ownerId;

  if (!isOwner && !isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tasks = await prisma.task.findMany({
    where: { projectId },
    include: {
      creator: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(tasks);
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
  const { title, assigneeId } = body as { title?: string; assigneeId?: string };

  if (!title?.trim()) {
    return NextResponse.json(
      { error: "Title is required" },
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
      { error: "Only project members can create tasks" },
      { status: 403 }
    );
  }

  const task = await prisma.task.create({
    data: {
      projectId,
      creatorId: session.user.id,
      title: title.trim(),
      assigneeId: assigneeId || undefined,
      status: "Todo"
    },
    include: {
      creator: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } }
    }
  });

  return NextResponse.json(task);
}
