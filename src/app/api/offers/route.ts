import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { applicationId } = body;

  if (!applicationId) {
    return NextResponse.json(
      { error: "Application ID is required" },
      { status: 400 }
    );
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      role: { include: { project: true } },
      applicant: true
    }
  });

  if (!application || !application.role?.project) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const project = application.role.project;
  if (project.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (application.status !== "Applied" && application.status !== "InReview") {
    return NextResponse.json(
      { error: "Application is not in a state that allows offers" },
      { status: 400 }
    );
  }

  const termsSnapshot = JSON.stringify({
    roleTitle: application.role.title,
    projectTitle: project.title,
    hoursPerWeek: project.hoursPerWeek,
    durationMonths: project.durationMonths,
    rewardModels: project.rewardModels
  });

  const [offer] = await prisma.$transaction([
    prisma.offer.create({
      data: {
        applicationId,
        termsSnapshot,
        status: "Offered"
      },
      include: {
        application: {
          include: {
            role: true,
            applicant: { select: { id: true, name: true, email: true } }
          }
        }
      }
    }),
    prisma.application.update({
      where: { id: applicationId },
      data: { status: "Offered" }
    })
  ]);

  const applicantEmail = application.applicant.email;
  if (applicantEmail) {
    sendEmail(
      applicantEmail,
      `You have an offer: ${project.title} — ${application.role.title}`,
      `<p>You've received an offer for the role <strong>${application.role.title}</strong> on the project <strong>${project.title}</strong>.</p><p><a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/inbox">View in Inbox</a> to accept or decline.</p>`
    ).catch(() => {});
  }

  return NextResponse.json(offer);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const offers = await prisma.offer.findMany({
    where: {
      application: { applicantId: session.user.id },
      status: "Offered"
    },
    include: {
      application: {
        include: {
          role: { include: { project: { include: { owner: { select: { name: true } } } } } }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(offers);
}
