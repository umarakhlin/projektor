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

  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const applications = await prisma.application.findMany({
    where: { role: { projectId } },
    include: {
      role: true,
      applicant: {
        select: { id: true, name: true, email: true, skills: true, links: true, availability: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const byRole = applications.reduce(
    (acc, app) => {
      const rId = app.roleId;
      if (!acc[rId]) acc[rId] = { role: app.role, applications: [] };
      acc[rId].applications.push(app);
      return acc;
    },
    {} as Record<string, { role: typeof applications[0]["role"]; applications: typeof applications }>
  );

  return NextResponse.json({
    project,
    byRole: Object.values(byRole)
  });
}
