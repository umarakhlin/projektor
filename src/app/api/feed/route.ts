import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProjectStatus, RoleState } from "@prisma/client";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10) || 20);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10) || 0;
  const stage = searchParams.get("stage");
  const category = searchParams.get("category");
  const roleType = searchParams.get("roleType");

  const where: Record<string, unknown> = {
    status: { in: [ProjectStatus.Recruiting, ProjectStatus.Active] }
  };

  if (stage) where.stage = stage;
  if (category) where.category = category;
  if (roleType) {
    where.roles = {
      some: {
        state: { not: RoleState.Filled },
        title: { contains: roleType }
      }
    };
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
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
    }),
    prisma.project.count({ where })
  ]);

  return NextResponse.json({
    projects,
    total,
    hasMore: offset + projects.length < total
  });
}
