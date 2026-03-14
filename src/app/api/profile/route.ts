import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { parseJsonArray, parseJsonObject } from "@/lib/safe-json";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      skills: true,
      links: true,
      availability: true,
      settings: true
    }
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const profile = {
    ...user,
    skills: parseJsonArray<string>(user.skills),
    links: parseJsonArray<{ url: string; label?: string }>(user.links),
    settings: parseJsonObject<{ showEmail?: boolean }>(user.settings, {})
  };

  return NextResponse.json(profile);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, skills, links, availability, settings } = body;

  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name ?? null;
  if (skills !== undefined) update.skills = Array.isArray(skills) ? JSON.stringify(skills) : null;
  if (links !== undefined) update.links = Array.isArray(links) ? JSON.stringify(links) : null;
  if (availability !== undefined) update.availability = availability ?? null;
  if (settings !== undefined) update.settings = typeof settings === "object" ? JSON.stringify(settings) : null;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: update,
    select: {
      id: true,
      email: true,
      name: true,
      skills: true,
      links: true,
      availability: true,
      settings: true
    }
  });

  const profile = {
    ...user,
    skills: parseJsonArray<string>(user.skills),
    links: parseJsonArray<{ url: string; label?: string }>(user.links),
    settings: parseJsonObject<{ showEmail?: boolean }>(user.settings, {})
  };

  return NextResponse.json(profile);
}
