import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import type { ProjectInput } from "@/lib/project-validation";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { track } from "@/lib/metrics";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      roles: true
    }
  });

  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.emailVerified) {
    return NextResponse.json(
      { error: "Please verify your email before creating a project." },
      { status: 403 }
    );
  }
  const { ok } = await rateLimit(getRateLimitKey(session.user.id, "create_project"), 5, 15 * 60_000);
  if (!ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
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
    hoursPerWeek,
    durationMonths,
    rewardModels,
    roles
  } = body;

  if (!title?.trim()) {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 }
    );
  }

  const project = await prisma.project.create({
    data: {
      ownerId: session.user.id,
      title: title.trim(),
      pitch: pitch?.trim() || null,
      problem: problem?.trim() || null,
      solution: solution?.trim() || null,
      stage: stage ?? "Idea",
      category: category ?? "Other",
      hoursPerWeek: hoursPerWeek ?? null,
      durationMonths: durationMonths ?? null,
      rewardModels: rewardModels?.length
        ? JSON.stringify(rewardModels)
        : null,
      status: "Draft"
    }
  });

  if (roles?.length) {
    await prisma.role.createMany({
      data: roles.map((r) => ({
        projectId: project.id,
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

  const created = await prisma.project.findUnique({
    where: { id: project.id },
    include: { roles: true }
  });

  track({ name: "project_created", projectId: project.id, userId: session.user.id });
  return NextResponse.json(created);
}
