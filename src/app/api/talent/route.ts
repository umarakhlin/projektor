import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { parseJsonArray, parseJsonObject } from "@/lib/safe-json";

type UserSettings = {
  avatarUrl?: string;
  showEmail?: boolean;
};

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId")?.trim() || null;
  const roleId = url.searchParams.get("roleId")?.trim() || null;
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  const users = await prisma.user.findMany({
    where: {
      id: { not: session.user.id }
    },
    select: {
      id: true,
      name: true,
      email: true,
      skills: true,
      availability: true,
      settings: true
    },
    orderBy: { updatedAt: "desc" },
    take: 200
  });

  const blockedUserIds = new Set<string>();
  let normalizedRequiredSkills: string[] = [];
  if (projectId) {
    const [project, memberships, activeApplications, selectedRole] = await Promise.all([
      prisma.project.findUnique({
        where: { id: projectId },
        select: { ownerId: true }
      }),
      prisma.membership.findMany({
        where: { projectId },
        select: { userId: true }
      }),
      prisma.application.findMany({
        where: {
          role: { projectId },
          status: { in: ["Applied", "InReview", "Offered", "Accepted"] }
        },
        select: { applicantId: true }
      }),
      roleId
        ? prisma.role.findUnique({
            where: { id: roleId },
            select: { id: true, projectId: true, requirements: true }
          })
        : Promise.resolve(null)
    ]);

    if (roleId && (!selectedRole || selectedRole.projectId !== projectId)) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
    if (selectedRole) {
      normalizedRequiredSkills = parseJsonArray<string>(selectedRole.requirements)
        .map((s) => (typeof s === "string" ? s.trim().toLowerCase() : ""))
        .filter(Boolean);
      normalizedRequiredSkills = [...new Set(normalizedRequiredSkills)];
    }
    
    if (!project || project.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    blockedUserIds.add(project.ownerId);
    memberships.forEach((m) => blockedUserIds.add(m.userId));
    activeApplications.forEach((a) => blockedUserIds.add(a.applicantId));
  }

  const list = users
    .map((u) => {
      const settings = parseJsonObject<UserSettings>(u.settings, {});
      const skills = parseJsonArray<string>(u.skills)
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter(Boolean);
      const normalizedSkills = skills.map((s) => s.toLowerCase());
      const matchedRequiredSkills = normalizedRequiredSkills.filter((reqSkill) =>
        normalizedSkills.includes(reqSkill)
      );
      const matchScore = normalizedRequiredSkills.length
        ? Math.round((matchedRequiredSkills.length / normalizedRequiredSkills.length) * 100)
        : null;
      return {
        id: u.id,
        name: u.name,
        email: settings.showEmail ? u.email : undefined,
        availability: u.availability,
        skills,
        avatarUrl: settings.avatarUrl,
        matchScore,
        matchedSkills: matchedRequiredSkills
      };
    })
    .filter((u) => !blockedUserIds.has(u.id))
    .filter((u) => {
      if (!q) return true;
      const hay = [
        u.name ?? "",
        u.email ?? "",
        u.availability ?? "",
        ...u.skills
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => {
      const scoreA = a.matchScore ?? -1;
      const scoreB = b.matchScore ?? -1;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return (a.name ?? "").localeCompare(b.name ?? "");
    });

  return NextResponse.json({
    users: list,
    roleRequirements: normalizedRequiredSkills
  });
}

