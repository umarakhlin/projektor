"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

const PATHS_WITHOUT_GATE = [
  "/nda",
  "/auth",
  "/api"
];

function isExempt(pathname: string | null): boolean {
  if (!pathname) return true;
  return PATHS_WITHOUT_GATE.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function NdaGate() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  // Cache only successful "no NDA required" results so the gate stops
  // hitting the API on every navigation. We do NOT cache the "required"
  // state — once the user accepts on /nda we want the next render to
  // re-check and let them through.
  const acceptedForSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;
    if (isExempt(pathname)) return;

    const userId = session.user.id;
    const startedAt = session.sessionStartedAt;
    const sessionKey = `${userId}:${startedAt ?? "no-start"}`;
    if (acceptedForSessionRef.current === sessionKey) return;

    let cancelled = false;
    fetch("/api/me/nda-status")
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (data: { required?: boolean } | null) => {
          if (cancelled) return;
          if (data?.required) {
            const callbackUrl = pathname || "/";
            router.replace(
              `/nda?callbackUrl=${encodeURIComponent(callbackUrl)}`
            );
            return;
          }
          acceptedForSessionRef.current = sessionKey;
        }
      )
      .catch(() => {
        /* swallow — don't lock people out on a transient error */
      });

    return () => {
      cancelled = true;
    };
  }, [
    status,
    session?.user?.id,
    session?.sessionStartedAt,
    pathname,
    router
  ]);

  return null;
}
