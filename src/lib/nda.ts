import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Bump this whenever the NDA wording materially changes. Existing
// users will be re-prompted to accept the new version on next sign-in.
export const NDA_VERSION = "2026-04-26";

export type NdaStatus = {
  required: boolean;
  ndaVersion: string;
  sessionStartedAt: number | null;
  lastAcceptedAt: string | null;
};

export async function getNdaStatusForCurrentUser(): Promise<NdaStatus | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { lastNdaAcceptedAt: true }
  });

  const sessionStartedAt = session.sessionStartedAt ?? null;
  const lastAcceptedAtMs = user?.lastNdaAcceptedAt
    ? user.lastNdaAcceptedAt.getTime()
    : null;

  const required =
    sessionStartedAt == null ||
    lastAcceptedAtMs == null ||
    lastAcceptedAtMs < sessionStartedAt;

  return {
    required,
    ndaVersion: NDA_VERSION,
    sessionStartedAt,
    lastAcceptedAt: user?.lastNdaAcceptedAt
      ? user.lastNdaAcceptedAt.toISOString()
      : null
  };
}
