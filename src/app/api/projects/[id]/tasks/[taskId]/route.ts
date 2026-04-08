import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId, taskId } = await params;
  const body = await req.json();
  const { status, assigneeId, dueAt } = body as {
    status?: string;
    assigneeId?: string | null;
    dueAt?: string | null;
  };

  const validStatuses = ["Todo", "Doing", "Done"];
  if (status !== undefined && !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true }
  });

  if (!task || task.projectId !== projectId) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const membership = await prisma.membership.findFirst({
    where: { projectId, userId: session.user.id }
  });
  const isOwner = task.project.ownerId === session.user.id;

  if (!isOwner && !membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updateData: {
    status?: "Todo" | "Doing" | "Done";
    assignee?: { connect: { id: string } } | { disconnect: true };
    dueAt?: Date | null;
  } = {};
  if (status !== undefined) updateData.status = status as "Todo" | "Doing" | "Done";
  if (assigneeId !== undefined) {
    updateData.assignee = assigneeId
      ? { connect: { id: assigneeId } }
      : { disconnect: true };
  }
  if (dueAt !== undefined) {
    updateData.dueAt = dueAt ? new Date(dueAt) : null;
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: {
      creator: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } }
    }
  });

  return NextResponse.json(updated);
}
