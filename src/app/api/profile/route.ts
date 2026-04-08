import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { parseJsonArray, parseJsonObject } from "@/lib/safe-json";

const MAX_SKILLS = 50;
const MAX_SKILL_LENGTH = 64;
const MAX_LINKS = 20;
const MAX_LINK_URL_LENGTH = 2048;
const MAX_LINK_LABEL_LENGTH = 80;
const MAX_AVAILABILITY_LENGTH = 200;
const MAX_NAME_LENGTH = 80;

function normalizeSkill(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > MAX_SKILL_LENGTH) return null;
  return trimmed;
}

function normalizeLink(
  input: unknown
): { url: string; label?: string } | null {
  if (input == null || typeof input !== "object") return null;
  const rawUrl = (input as { url?: unknown }).url;
  if (typeof rawUrl !== "string") return null;
  const url = rawUrl.trim();
  if (!url || url.length > MAX_LINK_URL_LENGTH) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  } catch {
    return null;
  }
  const rawLabel = (input as { label?: unknown }).label;
  if (rawLabel == null) return { url };
  if (typeof rawLabel !== "string") return null;
  const label = rawLabel.trim();
  if (!label || label.length > MAX_LINK_LABEL_LENGTH) return { url };
  return { url, label };
}

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
  if (name !== undefined) {
    if (name == null) {
      update.name = null;
    } else if (typeof name === "string") {
      const trimmedName = name.trim();
      if (!trimmedName) {
        update.name = null;
      } else if (trimmedName.length > MAX_NAME_LENGTH) {
        return NextResponse.json(
          { error: `Name must be at most ${MAX_NAME_LENGTH} characters.` },
          { status: 400 }
        );
      } else {
        update.name = trimmedName;
      }
    } else {
      return NextResponse.json({ error: "Invalid name format." }, { status: 400 });
    }
  }

  if (skills !== undefined) {
    if (skills == null) {
      update.skills = null;
    } else if (Array.isArray(skills)) {
      if (skills.length > MAX_SKILLS) {
        return NextResponse.json(
          { error: `Skills can include up to ${MAX_SKILLS} items.` },
          { status: 400 }
        );
      }
      const normalizedSkills = Array.from(
        new Set(skills.map(normalizeSkill).filter((item): item is string => item !== null))
      );
      update.skills = JSON.stringify(normalizedSkills);
    } else {
      return NextResponse.json({ error: "Skills must be an array." }, { status: 400 });
    }
  }

  if (links !== undefined) {
    if (links == null) {
      update.links = null;
    } else if (Array.isArray(links)) {
      if (links.length > MAX_LINKS) {
        return NextResponse.json(
          { error: `Links can include up to ${MAX_LINKS} items.` },
          { status: 400 }
        );
      }
      const normalizedLinks = links
        .map(normalizeLink)
        .filter((item): item is { url: string; label?: string } => item !== null);
      update.links = JSON.stringify(normalizedLinks);
    } else {
      return NextResponse.json({ error: "Links must be an array." }, { status: 400 });
    }
  }

  if (availability !== undefined) {
    if (availability == null) {
      update.availability = null;
    } else if (typeof availability === "string") {
      const trimmedAvailability = availability.trim();
      if (trimmedAvailability.length > MAX_AVAILABILITY_LENGTH) {
        return NextResponse.json(
          { error: `Availability must be at most ${MAX_AVAILABILITY_LENGTH} characters.` },
          { status: 400 }
        );
      }
      update.availability = trimmedAvailability || null;
    } else {
      return NextResponse.json(
        { error: "Availability must be a string." },
        { status: 400 }
      );
    }
  }
  if (settings !== undefined) {
    if (typeof settings === "object" && settings !== null) {
      const existing = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { settings: true }
      });
      const existingSettings = parseJsonObject<Record<string, unknown>>(
        existing?.settings,
        {}
      );
      update.settings = JSON.stringify({ ...existingSettings, ...settings });
    } else {
      update.settings = null;
    }
  }

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
