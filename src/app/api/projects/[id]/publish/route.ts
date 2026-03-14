import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { validatePublishChecklist } from "@/lib/project-validation";
import { track } from "@/lib/metrics";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: { roles: true }
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (project.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (project.status !== "Draft") {
    return NextResponse.json(
      { error: "Project is not a draft" },
      { status: 400 }
    );
  }

  const checklist = validatePublishChecklist({
    title: project.title,
    pitch: project.pitch,
    problem: project.problem,
    solution: project.solution,
    hoursPerWeek: project.hoursPerWeek,
    durationMonths: project.durationMonths,
    rewardModels: project.rewardModels,
    roles: project.roles
  });

  if (!checklist.overall) {
    return NextResponse.json(
      {
        error: "Project does not meet publish requirements",
        checklist
      },
      { status: 400 }
    );
  }

  const updated = await prisma.project.update({
    where: { id },
    data: { status: "Recruiting" },
    include: { roles: true }
  });

  track({ name: "project_published", projectId: id, userId: session.user.id });
  return NextResponse.json(updated);
}
