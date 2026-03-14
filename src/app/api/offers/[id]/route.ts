import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { track } from "@/lib/metrics";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: offerId } = await params;
  const body = await req.json();
  const { action } = body;

  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: {
      application: {
        include: {
          role: { include: { project: true } },
          applicant: true
        }
      }
    }
  });

  if (!offer || !offer.application) {
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  }

  if (offer.application.applicantId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (offer.status !== "Offered") {
    return NextResponse.json(
      { error: "Offer has already been responded to" },
      { status: 400 }
    );
  }

  const role = offer.application.role;
  const project = role.project;

  if (action === "decline") {
    await prisma.$transaction([
      prisma.offer.update({
        where: { id: offerId },
        data: { status: "Declined" }
      }),
      prisma.application.update({
        where: { id: offer.applicationId },
        data: { status: "Declined" }
      })
    ]);
    track({ name: "offer_declined", offerId, projectId: project.id, userId: session.user.id });
    return NextResponse.json({ ok: true });
  }

  if (action === "accept") {
    const openSlots = role.openings - role.filledCount;
    if (openSlots <= 0) {
      return NextResponse.json(
        { error: "This role is no longer open" },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.offer.update({
        where: { id: offerId },
        data: { status: "Accepted" }
      }),
      prisma.application.update({
        where: { id: offer.applicationId },
        data: { status: "Accepted" }
      }),
      prisma.membership.create({
        data: {
          userId: offer.application.applicantId,
          projectId: project!.id,
          roleId: role.id
        }
      }),
      prisma.role.update({
        where: { id: role.id },
        data: { filledCount: { increment: 1 } }
      })
    ]);

    const roleUpdated = await prisma.role.findUnique({ where: { id: role.id } });
    if (roleUpdated && roleUpdated.filledCount >= roleUpdated.openings) {
      await prisma.role.update({
        where: { id: role.id },
        data: { state: "Filled" }
      });
    }

    track({ name: "offer_accepted", offerId, projectId: project!.id, userId: session.user.id });
    return NextResponse.json({ ok: true, projectId: project!.id });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
