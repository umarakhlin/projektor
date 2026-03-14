import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { parseJsonArray, parseJsonObject } from "@/lib/safe-json";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
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

  const session = await getServerSession(authOptions);
  const isOwnProfile = session?.user?.id === userId;
  const settings = parseJsonObject<{ showEmail?: boolean }>(user.settings, {});

  const profile = {
    id: user.id,
    name: user.name,
    skills: parseJsonArray<string>(user.skills),
    links: parseJsonArray<{ url: string; label?: string }>(user.links),
    availability: user.availability,
    email: isOwnProfile || settings.showEmail ? user.email : undefined
  };

  return NextResponse.json(profile);
}
