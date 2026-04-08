"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navLinkClass = (active: boolean) =>
  active
    ? "rounded-md border border-brand/50 bg-brand/10 px-2 py-1.5 text-sm font-medium text-brand"
    : "rounded-md px-2 py-1.5 text-sm text-slate-400 hover:text-slate-50";

export function HeaderAuth() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [teamUnread, setTeamUnread] = useState<number>(0);
  const [inboxUnread, setInboxUnread] = useState<number>(0);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const totalUnread = inboxUnread + teamUnread;

  useEffect(() => {
    if (!session?.user?.id) {
      setTeamUnread(0);
      return;
    }

    const loadUnread = () => {
      fetch("/api/me/team-space-notifications")
        .then((r) => (r.ok ? r.json() : { totalUnread: 0 }))
        .then((d: { totalUnread?: number }) => {
          setTeamUnread(typeof d.totalUnread === "number" ? d.totalUnread : 0);
        })
        .catch(() => setTeamUnread(0));
    };

    loadUnread();
    const interval = setInterval(loadUnread, 10000);
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) {
      setInboxUnread(0);
      return;
    }
    const loadInboxUnread = () => {
      Promise.all([
        fetch("/api/offers").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/me/application-notifications").then((r) =>
          r.ok ? r.json() : []
        )
      ])
        .then(([offers, apps]) => {
          const offersCount = Array.isArray(offers) ? offers.length : 0;
          const appsCount = Array.isArray(apps) ? apps.length : 0;
          setInboxUnread(offersCount + appsCount);
        })
        .catch(() => setInboxUnread(0));
    };
    loadInboxUnread();
    const interval = setInterval(loadInboxUnread, 10000);
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) {
      setAvatarUrl("");
      return;
    }
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((profile: { settings?: { avatarUrl?: string } } | null) => {
        setAvatarUrl(profile?.settings?.avatarUrl ?? "");
      })
      .catch(() => setAvatarUrl(""));
  }, [session?.user?.id]);

  if (status === "loading") {
    return <span className="text-sm text-slate-400">Loading…</span>;
  }

  if (session) {
    return (
      <nav className="flex flex-wrap items-center gap-2">
        <Link href="/" className={navLinkClass(pathname === "/")}>
          Feed
        </Link>
        <Link href="/explore" className={navLinkClass(pathname === "/explore")}>
          Explore
        </Link>
        <Link href="/create" className={navLinkClass(pathname === "/create")}>
          Create
        </Link>
        <Link
          href="/inbox"
          className={`flex items-center gap-2 ${navLinkClass(pathname === "/inbox")}`}
          title="Inbox and notifications"
        >
          <span>Inbox</span>
          <span aria-hidden="true">🔔</span>
          {inboxUnread > 0 && (
            <span className="inline-flex min-w-[1.25rem] justify-center rounded-full bg-brand px-1 text-[0.7rem] font-medium text-white">
              {inboxUnread}
            </span>
          )}
          {totalUnread > inboxUnread && (
            <span className="inline-flex min-w-[1.25rem] justify-center rounded-full bg-brand px-1 text-[0.7rem] font-medium text-white">
              {totalUnread}
            </span>
          )}
        </Link>
        <Link
          href="/team-space"
          className={`flex items-center gap-1 ${navLinkClass(pathname === "/team-space")}`}
        >
          <span>Team Space</span>
          {teamUnread > 0 && (
            <span className="inline-flex min-w-[1.25rem] justify-center rounded-full bg-brand px-1 text-[0.7rem] font-medium text-white">
              {teamUnread}
            </span>
          )}
        </Link>
        <Link
          href="/my-projects"
          className={navLinkClass(pathname === "/my-projects")}
        >
          <span>My Projects</span>
        </Link>
        <Link
          href="/profile"
          className={`${pathname === "/profile" ? "rounded-md border border-brand/50 bg-brand/10 text-brand" : "text-slate-500 hover:text-slate-50"} flex items-center gap-2 px-2 py-1.5 text-sm font-medium`}
          title="Profile"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="h-6 w-6 rounded-full border border-slate-700 object-cover"
            />
          ) : (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-[0.65rem] text-slate-300">
              {(session.user?.email?.[0] ?? "U").toUpperCase()}
            </span>
          )}
          {session.user?.email}
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded-md px-2 py-1.5 text-sm text-slate-400 hover:text-slate-50"
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
