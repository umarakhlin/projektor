"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function HeaderAuth() {
  const { data: session, status } = useSession();
  const [creatorApplications, setCreatorApplications] = useState<number | null>(null);

  useEffect(() => {
    if (!session?.user?.id) {
      setCreatorApplications(null);
      return;
    }
    fetch("/api/me/application-stats")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: { totalOpen?: number }) => {
        if (typeof d?.totalOpen === "number") setCreatorApplications(d.totalOpen);
      })
      .catch(() => setCreatorApplications(null));
  }, [session?.user?.id]);

  if (status === "loading") {
    return <span className="text-sm text-slate-400">Loading…</span>;
  }

  if (session) {
    return (
      <nav className="flex items-center gap-4">
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-50">
          Feed
        </Link>
        <Link href="/explore" className="text-sm text-slate-400 hover:text-slate-50">
          Explore
        </Link>
        <Link href="/create" className="text-sm text-brand hover:text-brand-light">
          Create
        </Link>
        <Link href="/inbox" className="text-sm text-slate-400 hover:text-slate-50">
          Inbox
        </Link>
        <Link href="/my-projects" className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-50">
          <span>My Projects</span>
          {creatorApplications && creatorApplications > 0 && (
            <span className="inline-flex min-w-[1.25rem] justify-center rounded-full bg-brand px-1 text-[0.7rem] font-medium text-white">
              {creatorApplications}
            </span>
          )}
        </Link>
        <Link href="/profile" className="text-sm text-slate-400 hover:text-slate-50">
          Profile
        </Link>
        <span className="text-sm text-slate-500">{session.user?.email}</span>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-sm text-slate-400 hover:text-slate-50"
        >
          Sign out
        </button>
      </nav>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Link href="/auth/signin" className="text-sm text-slate-400 hover:text-slate-50">
        Sign in
      </Link>
      <Link
        href="/auth/signup"
        className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-light"
      >
        Sign up
      </Link>
    </div>
  );
}
