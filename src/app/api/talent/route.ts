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
    take: 500
  });

  const list = users
    .map((u) => {
      const settings = parseJsonObject<UserSettings>(u.settings, {});
      const skills = parseJsonArray<string>(u.skills)
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter(Boolean);
      return {
        id: u.id,
        name: u.name,
        email: settings.showEmail ? u.email : undefined,
        availability: u.availability,
        skills,
        avatarUrl: settings.avatarUrl
      };
    })
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
    });

  return NextResponse.json({ users: list });
}
