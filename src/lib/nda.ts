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

async function readLastNdaAcceptedAt(userId: string): Promise<Date | null> {
  // We use $queryRaw so this works even if a freshly deployed Prisma
  // client hasn't picked up the lastNdaAcceptedAt column yet.
  const rows = await prisma.$queryRaw<
    { last_nda_accepted_at: Date | null }[]
  >`SELECT "last_nda_accepted_at" FROM "users" WHERE "id" = ${userId} LIMIT 1`;
  const row = rows[0];
  if (!row) return null;
  return row.last_nda_accepted_at ?? null;
}

export async function getNdaStatusForCurrentUser(): Promise<NdaStatus | null> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;

    let lastNdaAcceptedAt: Date | null = null;
    try {
      lastNdaAcceptedAt = await readLastNdaAcceptedAt(session.user.id);
    } catch (err) {
      console.error(
        "[nda] readLastNdaAcceptedAt failed",
        err instanceof Error ? err.message : err
      );
      // Fail open: don't lock the site if the column lookup fails.
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

    console.log(
      `[nda] status user=${session.user.id} sessionStartedAt=${sessionStartedAt} lastAccepted=${lastAcceptedAtMs} required=${required}`
    );

    return {
      required,
      ndaVersion: NDA_VERSION,
      sessionStartedAt,
      lastAcceptedAt: lastNdaAcceptedAt
        ? lastNdaAcceptedAt.toISOString()
        : null
    };
  } catch (err) {
    console.error(
      "[nda] getNdaStatusForCurrentUser failed",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}
