import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { track } from "@/lib/metrics";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status } = body as { status?: string };

  const validStatuses = ["Active", "Closed", "Recruiting"];
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: "Invalid status. Use Active, Closed, or Recruiting" },
      { status: 400 }
    );
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: { memberships: true }
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Active requires at least one member (besides owner)
  if (status === "Active") {
    const memberCount = project.memberships.length;
    if (memberCount < 1) {
      return NextResponse.json(
        { error: "Project needs at least one member before setting to Active" },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.project.update({
    where: { id },
    data: { status: status as "Active" | "Closed" | "Recruiting" }
  });

  if (status === "Active") track({ name: "project_active", projectId: id, userId: session.user.id });
  if (status === "Closed") track({ name: "project_closed", projectId: id, userId: session.user.id });
  return NextResponse.json(updated);
}
