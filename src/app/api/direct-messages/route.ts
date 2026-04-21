import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

const MAX_LENGTH = 2000;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const rows = await prisma.directMessage.findMany({
    where: {
      OR: [{ recipientId: userId }, { senderId: userId }]
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      sender: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } }
    }
  });

  const messages = rows.map((m) => {
    const direction = m.senderId === userId ? "out" : "in";
    const partner = direction === "out" ? m.recipient : m.sender;
    return {
      id: m.id,
      content: m.content,
      readAt: m.readAt,
      createdAt: m.createdAt,
      direction,
      partner
    };
  });

  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ok } = await rateLimit(
    getRateLimitKey(session.user.id, "direct_messages"),
    20,
    15 * 60_000
  );
  if (!ok) {
    return NextResponse.json(
      { error: "Too many messages. Please try again later." },
      { status: 429 }
    );
  }

  let body: { recipientId?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const recipientId = body.recipientId?.trim();
  const content = body.content?.trim();

  if (!recipientId) {
    return NextResponse.json({ error: "Recipient is required" }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }
  if (content.length > MAX_LENGTH) {
    return NextResponse.json(
      { error: `Message is too long (max ${MAX_LENGTH} characters).` },
      { status: 400 }
    );
  }
  if (recipientId === session.user.id) {
    return NextResponse.json(
      { error: "You cannot message yourself." },
      { status: 400 }
    );
  }

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { id: true, email: true, name: true }
  });
  if (!recipient) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }

  const message = await prisma.directMessage.create({
    data: {
      senderId: session.user.id,
      recipientId: recipient.id,
      content
    }
  });

  sendEmail(
    recipient.email,
    `New message on Projektor`,
    `<p>${session.user.email ?? "Someone"} sent you a message on Projektor.</p><p><a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/inbox">Open Inbox</a> to read and reply.</p>`
  ).catch(() => {});

  return NextResponse.json({ ok: true, id: message.id });
}
