import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function resolveBaseUrl(origin?: string | null): string {
  if (origin) return origin;
  const envUrl = process.env.NEXTAUTH_URL?.trim();
  return envUrl && envUrl.length > 0 ? envUrl : "http://localhost:3000";
}

export async function issueEmailVerificationToken(
  userId: string,
  origin?: string | null
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt
    }
  });

  const baseUrl = resolveBaseUrl(origin);
  return `${baseUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;
}

export async function verifyEmailToken(token: string): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!token || token.length < 16) {
    return { ok: false, message: "Invalid verification link." };
  }

  const tokenHash = hashToken(token);
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  if (!record) {
    return { ok: false, message: "Invalid or already used verification link." };
  }

  if (record.expiresAt < new Date()) {
    await prisma.emailVerificationToken.delete({ where: { tokenHash } });
    return { ok: false, message: "This verification link has expired." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() }
    }),
    prisma.emailVerificationToken.deleteMany({
      where: { userId: record.userId }
    })
  ]);

  return { ok: true, message: "Your email is verified. You can now create projects." };
}
