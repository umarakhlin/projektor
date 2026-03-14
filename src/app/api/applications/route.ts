import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";
import { track } from "@/lib/metrics";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { ok } = rateLimit(getRateLimitKey(session.user.id, "apply"), 10, 15 * 60_000);
  if (!ok) {
    return NextResponse.json(
      { error: "Too many applications. Try again later." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const { roleId, message, links, availability } = body;

  if (!roleId) {
    return NextResponse.json(
      { error: "Role ID is required" },
      { status: 400 }
    );
  }

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { project: true }
  });

  if (!role || !role.project) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  if (role.project.status !== "Recruiting") {
    return NextResponse.json(
      { error: "Project is not accepting applications" },
      { status: 400 }
    );
  }

  if (role.state === "Filled") {
    return NextResponse.json(
      { error: "This role is no longer open" },
      { status: 400 }
    );
  }

  const existing = await prisma.application.findFirst({
    where: {
      roleId,
      applicantId: session.user.id,
      status: { in: ["Applied", "InReview", "Offered"] }
    }
  });
  if (existing) {
    return NextResponse.json(
      { error: "You have already applied to this role" },
      { status: 409 }
    );
  }

  const application = await prisma.application.create({
    data: {
      roleId,
      applicantId: session.user.id,
      message: message?.trim() || null,
      links: Array.isArray(links) ? JSON.stringify(links) : null,
      availability: availability?.trim() || null,
      status: "Applied"
    },
    include: {
      role: { include: { project: true } },
      applicant: { select: { id: true, name: true, email: true } }
    }
  });

  await prisma.role.update({
    where: { id: roleId },
    data: { state: "HasApplicants" }
  });

  track({
    name: "application_created",
    applicationId: application.id,
    projectId: role.project.id,
    userId: session.user.id
  });

  const owner = await prisma.user.findUnique({
    where: { id: role.project.ownerId },
    select: { email: true }
  });
  if (owner?.email) {
    const applicantName = application.applicant.name || application.applicant.email;
    sendEmail(
      owner.email,
      `New application to ${role.project.title}`,
      `<p>${applicantName} applied to the role <strong>${role.title}</strong> on your project ${role.project.title}.</p><p><a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/projects/${role.project.id}/applications">View applications</a></p>`
    ).catch(() => {});
  }

  return NextResponse.json(application);
}
