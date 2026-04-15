import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;

  let body: { userId?: string; roleId?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const userId = body.userId?.trim();
  const roleId = body.roleId?.trim();
  const note = body.note?.trim();

  if (!userId || !roleId) {
    return NextResponse.json(
      { error: "User and role are required" },
      { status: 400 }
    );
  }

  const [project, role, user, member] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, ownerId: true, title: true, hoursPerWeek: true, durationMonths: true, rewardModels: true }
    }),
    prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, projectId: true, title: true, state: true }
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true }
    }),
    prisma.membership.findFirst({
      where: { projectId, userId },
      select: { id: true }
    })
  ]);

  if (!project || project.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!role || role.projectId !== project.id) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (role.state === "Filled") {
    return NextResponse.json({ error: "This role is no longer open" }, { status: 400 });
  }
  if (member) {
    return NextResponse.json(
      { error: "User is already a team member" },
      { status: 409 }
    );
  }

  const existing = await prisma.application.findFirst({
    where: {
      roleId: role.id,
      applicantId: user.id,
      status: { in: ["Applied", "InReview", "Offered", "Accepted"] }
    },
    select: { id: true }
  });
  if (existing) {
    return NextResponse.json(
      { error: "This user already has an active invitation/application for this role" },
      { status: 409 }
    );
  }

  const application = await prisma.$transaction(async (tx) => {
    const created = await tx.application.create({
      data: {
        roleId: role.id,
        applicantId: user.id,
        message: note || "Project owner invited you to this role.",
        status: "Offered"
      }
    });

    await tx.offer.create({
      data: {
        applicationId: created.id,
        termsSnapshot: JSON.stringify({
          roleTitle: role.title,
          projectTitle: project.title,
          hoursPerWeek: project.hoursPerWeek,
          durationMonths: project.durationMonths,
          rewardModels: project.rewardModels
        }),
        status: "Offered"
      }
    });
    return created;
  });

  await prisma.role.update({
    where: { id: role.id },
    data: { state: "HasApplicants" }
  });

  sendEmail(
    user.email,
    `You have an invite: ${project.title} — ${role.title}`,
    `<p>${session.user.email ?? "A project owner"} invited you to the role <strong>${role.title}</strong> on project <strong>${project.title}</strong>.</p><p><a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/inbox">View invite in Inbox</a></p>`
  ).catch(() => {});

  return NextResponse.json({ ok: true, applicationId: application.id });
}

