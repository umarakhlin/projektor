import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromCookies } from "@/lib/auth-request";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const userId = await getUserIdFromCookies();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const existing = await prisma.savedProject.findFirst({
    where: { userId, projectId }
  });
  if (existing) {
    return NextResponse.json({ ok: true, alreadySaved: true });
  }

  try {
    await prisma.savedProject.create({
      data: {
        userId,
        projectId
      }
    });
  } catch (e) {
    console.error("[saved-projects POST]", e);
    return NextResponse.json(
      { error: "Could not save project. Try running: npx prisma migrate dev" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const userId = await getUserIdFromCookies();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  await prisma.savedProject.deleteMany({
    where: { userId, projectId }
  });

  return NextResponse.json({ ok: true });
}
