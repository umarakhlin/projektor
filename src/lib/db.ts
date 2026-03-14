import { prisma } from "./prisma";
import { ProjectStatus, RoleState } from "@prisma/client";

// Re-export prisma client for direct use
export { prisma };

/**
 * Get projects for discovery feed (Recruiting and Active only)
 */
export async function getFeedProjects(opts?: {
  limit?: number;
  offset?: number;
}) {
  const { limit = 20, offset = 0 } = opts ?? {};
  return prisma.project.findMany({
    where: {
      status: { in: [ProjectStatus.Recruiting, ProjectStatus.Active] },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    skip: offset,
    include: {
      owner: { select: { id: true, name: true, email: true } },
      roles: { where: { state: { not: RoleState.Filled } } },
    },
  });
}
