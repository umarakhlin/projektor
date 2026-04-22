import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { parseJsonObject } from "@/lib/safe-json";

export const dynamic = "force-dynamic";

const QUIET_WINDOW_MS = 5 * 60 * 1000;
const COOLDOWN_MS = 30 * 60 * 1000;
const MAX_MESSAGES_PER_RUN = 500;

type UserSettings = {
  dmEmailNotifications?: boolean;
};

function authorize(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  const header = req.headers.get("authorization");
  return header === `Bearer ${expected}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const quietCutoff = new Date(now.getTime() - QUIET_WINDOW_MS);

  const candidates = await prisma.directMessage.findMany({
    where: {
      readAt: null,
      emailNotifiedAt: null,
      createdAt: { lte: quietCutoff }
    },
    orderBy: { createdAt: "asc" },
    take: MAX_MESSAGES_PER_RUN,
    include: {
      sender: { select: { id: true, name: true, email: true } },
      recipient: {
        select: { id: true, name: true, email: true, settings: true }
      }
    }
  });

  if (candidates.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, processed: 0 });
  }

  type Group = {
    recipient: (typeof candidates)[number]["recipient"];
    sender: (typeof candidates)[number]["sender"];
    messages: typeof candidates;
  };
  const groups = new Map<string, Group>();
  for (const m of candidates) {
    const key = `${m.recipientId}:${m.senderId}`;
    const existing = groups.get(key);
    if (existing) {
      existing.messages.push(m);
    } else {
      groups.set(key, {
        recipient: m.recipient,
        sender: m.sender,
        messages: [m]
      });
    }
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  let sent = 0;
  let skipped = 0;

  for (const group of groups.values()) {
    const settings = parseJsonObject<UserSettings>(
      group.recipient.settings,
      {}
    );
    const optedIn = settings.dmEmailNotifications ?? true;
    if (!optedIn) {
      await prisma.directMessage.updateMany({
        where: { id: { in: group.messages.map((m) => m.id) } },
        data: { emailNotifiedAt: now }
      });
      skipped += group.messages.length;
      continue;
    }

    const cooldownSince = new Date(now.getTime() - COOLDOWN_MS);
    const recent = await prisma.directMessage.findFirst({
      where: {
        recipientId: group.recipient.id,
        senderId: group.sender.id,
        emailNotifiedAt: { gte: cooldownSince }
      },
      select: { id: true }
    });
    if (recent) {
      skipped += group.messages.length;
      continue;
    }

    const senderLabel =
      group.sender.name?.trim() || group.sender.email || "Someone";
    const count = group.messages.length;
    const preview = escapeHtml(
      group.messages[group.messages.length - 1].content.slice(0, 240)
    );
    const chatUrl = `${baseUrl}/messages/${group.sender.id}`;

    const subject =
      count === 1
        ? `New message from ${senderLabel}`
        : `${count} new messages from ${senderLabel}`;

    const html = `
      <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px;">
        <p style="margin:0 0 12px 0;">
          <strong>${escapeHtml(senderLabel)}</strong> sent you
          ${count === 1 ? "a message" : `${count} messages`} on Projektor.
        </p>
        <blockquote style="margin:0 0 16px 0; padding:12px 16px; border-left:3px solid #6366f1; background:#f5f5f7; color:#111; white-space:pre-wrap; border-radius:4px;">
          ${preview}${group.messages[group.messages.length - 1].content.length > 240 ? "…" : ""}
        </blockquote>
        <p style="margin:0 0 16px 0;">
          <a href="${chatUrl}" style="display:inline-block; padding:10px 16px; background:#6366f1; color:#fff; text-decoration:none; border-radius:6px;">
            Open conversation
          </a>
        </p>
        <p style="margin:24px 0 0 0; color:#666; font-size:12px;">
          You can turn these emails off from your <a href="${baseUrl}/profile">profile settings</a>.
        </p>
      </div>
    `;

    const result = await sendEmail(group.recipient.email, subject, html);
    if (result.ok) {
      await prisma.directMessage.updateMany({
        where: { id: { in: group.messages.map((m) => m.id) } },
        data: { emailNotifiedAt: now }
      });
      sent += 1;
    } else {
      skipped += group.messages.length;
    }
  }

  return NextResponse.json({
    sent,
    skipped,
    processed: candidates.length,
    groups: groups.size
  });
}
