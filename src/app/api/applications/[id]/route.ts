import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { action } = body;

  const application = await prisma.application.findUnique({
    where: { id },
    include: { role: { include: { project: true } } }
  });

  if (!application || !application.role?.project) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const project = application.role.project;
  if (project.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (action === "reject") {
    await prisma.application.update({
      where: { id },
      data: { status: "Rejected" }
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "in_review") {
    await prisma.application.update({
      where: { id },
      data: { status: "InReview" }
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
