import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: { ownerId: session.user.id },
    select: { id: true }
  });

  if (projects.length === 0) {
    return NextResponse.json({ totalOpen: 0, byProject: [] });
  }

  const projectIds = projects.map((p) => p.id);

  const applications = await prisma.application.findMany({
    where: {
      role: { projectId: { in: projectIds } },
      status: { in: ["Applied", "InReview", "Offered"] }
    },
    select: { id: true, role: { select: { projectId: true } } }
  });

  const counts: Record<string, number> = {};
  for (const app of applications) {
    const pid = app.role.projectId;
    counts[pid] = (counts[pid] ?? 0) + 1;
  }

  const byProject = Object.entries(counts).map(([projectId, count]) => ({
    projectId,
    openApplications: count
  }));

  const totalOpen = applications.length;

  return NextResponse.json({ totalOpen, byProject });
}
