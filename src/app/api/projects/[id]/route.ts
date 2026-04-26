import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import type { ProjectInput } from "@/lib/project-validation";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      roles: true,
      memberships: {
        include: {
          user: { select: { id: true, name: true } },
          role: { select: { title: true } }
        }
      }
    }
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.status === "Draft") {
    const session = await getServerSession(authOptions);
    if (session?.user?.id !== project.ownerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json(project);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  if (project.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (project.status !== "Draft") {
    return NextResponse.json(
      { error: "Can only edit draft projects" },
      { status: 400 }
    );
  }

  const body = (await req.json()) as Partial<ProjectInput>;
  const {
    title,
    pitch,
    problem,
    solution,
    stage,
    category,
    visibility,
    hoursPerWeek,
    durationMonths,
    rewardModels,
    roles
  } = body;

  const update: Record<string, unknown> = {};
  if (title !== undefined) update.title = title?.trim() ?? project.title;
  if (pitch !== undefined) update.pitch = pitch?.trim() ?? null;
  if (problem !== undefined) update.problem = problem?.trim() ?? null;
  if (solution !== undefined) update.solution = solution?.trim() ?? null;
  if (stage !== undefined) update.stage = stage ?? project.stage;
  if (category !== undefined) update.category = category ?? project.category;
  if (visibility !== undefined) {
    update.visibility = visibility ?? project.visibility;
  }
  if (hoursPerWeek !== undefined) update.hoursPerWeek = hoursPerWeek ?? null;
  if (durationMonths !== undefined) update.durationMonths = durationMonths ?? null;
  if (rewardModels !== undefined) {
    update.rewardModels =
      rewardModels?.length ? JSON.stringify(rewardModels) : null;
  }

  await prisma.project.update({
    where: { id },
    data: update
  });

  if (roles !== undefined) {
    await prisma.role.deleteMany({ where: { projectId: id } });
    if (roles.length > 0) {
      await prisma.role.createMany({
        data: roles.map((r) => ({
          projectId: id,
          title: r.title.trim(),
          requirements: r.requirements?.length
            ? JSON.stringify(r.requirements)
            : null,
          timeExpectation: r.timeExpectation?.trim() || null,
          openings: Math.max(1, r.openings ?? 1),
          compensationOverride: r.compensationOverride
            ? JSON.stringify(r.compensationOverride)
            : null
        }))
      });
    }
  }

  const updated = await prisma.project.findUnique({
    where: { id },
    include: { roles: true }
  });

  return NextResponse.json(updated);
}
