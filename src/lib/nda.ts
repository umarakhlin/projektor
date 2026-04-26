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
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    let lastNdaAcceptedAt: Date | null = null;
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { lastNdaAcceptedAt: true }
      });
      lastNdaAcceptedAt = user?.lastNdaAcceptedAt ?? null;
    } catch (err) {
      // Column may not exist yet on this environment. Fail open so the
      // app keeps working; the gate will simply not redirect.
      console.error("[nda] lastNdaAcceptedAt lookup failed:", err);
      return {
        required: false,
        ndaVersion: NDA_VERSION,
        sessionStartedAt: session.sessionStartedAt ?? null,
        lastAcceptedAt: null
      };
    }

    const sessionStartedAt = session.sessionStartedAt ?? null;
    const lastAcceptedAtMs = lastNdaAcceptedAt
      ? lastNdaAcceptedAt.getTime()
      : null;

    const required =
      sessionStartedAt == null ||
      lastAcceptedAtMs == null ||
      lastAcceptedAtMs < sessionStartedAt;

    return {
      required,
      ndaVersion: NDA_VERSION,
      sessionStartedAt,
      lastAcceptedAt: lastNdaAcceptedAt
        ? lastNdaAcceptedAt.toISOString()
        : null
    };
  } catch (err) {
    console.error("[nda] getNdaStatusForCurrentUser failed:", err);
    return null;
  }
}
