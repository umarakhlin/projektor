import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromCookies } from "@/lib/auth-request";
import { RoleState } from "@prisma/client";

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromCookies();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const withProjects = req.nextUrl.searchParams.get("withProjects") === "1";

  if (!withProjects) {
    const rows = await prisma.savedProject.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { projectId: true }
    });
    return NextResponse.json({
      projectIds: rows.map((r) => r.projectId)
    });
  }

  const rows = await prisma.savedProject.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      project: {
        include: {
          owner: { select: { id: true, name: true } },
          roles: {
            where: { state: { not: RoleState.Filled } },
            select: {
              id: true,
              title: true,
              openings: true,
              filledCount: true,
              requirements: true
            }
          }
        }
      }
    }
  });

  const projects = rows.map((r) => r.project).filter(Boolean);
  return NextResponse.json({ projects });
}
