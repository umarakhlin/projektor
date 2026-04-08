import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applications = await prisma.application.findMany({
    where: {
      role: { project: { ownerId: session.user.id } },
      status: { in: ["Applied", "InReview"] }
    },
    include: {
      role: {
        select: {
          id: true,
          title: true,
          project: { select: { id: true, title: true } }
        }
      },
      applicant: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  const list = applications.map((app) => ({
    id: app.id,
    applicantName: app.applicant.name ?? "Someone",
    roleTitle: app.role.title,
    projectId: app.role.project.id,
    projectTitle: app.role.project.title,
    status: app.status,
    createdAt: app.createdAt
  }));

  return NextResponse.json(list);
}
