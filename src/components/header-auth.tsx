"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { subscribeMessagesBus } from "@/lib/messages-bus";

const navLinkClass = (active: boolean) =>
  active
    ? "rounded-md border border-brand/50 bg-brand/10 px-2 py-1.5 text-sm font-medium text-brand"
    : "rounded-md px-2 py-1.5 text-sm text-slate-400 hover:text-slate-50";

export function HeaderAuth() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [teamUnread, setTeamUnread] = useState<number>(0);
  const [inboxUnread, setInboxUnread] = useState<number>(0);
  const [messagesUnread, setMessagesUnread] = useState<number>(0);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [showEmailReminder, setShowEmailReminder] = useState(false);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const totalUnread = inboxUnread + teamUnread + messagesUnread;
  const inboxBadge = inboxUnread + messagesUnread;

  useEffect(() => {
    setShowEmailReminder(
      Boolean(
        session?.user &&
          !session.user.emailVerified &&
          session.user.emailVerificationReminderPending
      )
    );
  }, [session?.user]);

  async function acknowledgeEmailReminder() {
    setShowEmailReminder(false);
    await fetch("/api/me/email-verification-reminder/seen", { method: "POST" });
  }

  async function verifyNowFromReminder() {
    setVerificationBusy(true);
    const res = await fetch("/api/me/email-verification-link", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setVerificationBusy(false);
    if (res.ok && typeof data.verificationUrl === "string") {
      window.location.href = data.verificationUrl;
      return;
    }
    alert(data.error ?? "Could not create verification link right now.");
  }

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

  const loadInboxUnreadRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!session?.user?.id) {
      setInboxUnread(0);
      setMessagesUnread(0);
      loadInboxUnreadRef.current = () => {};
      return;
    }
    const loadInboxUnread = () => {
      Promise.all([
        fetch("/api/offers").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/me/application-notifications").then((r) =>
          r.ok ? r.json() : []
        ),
        fetch("/api/me/unread-messages").then((r) =>
          r.ok ? r.json() : { count: 0 }
        )
      ])
        .then(([offers, apps, messages]) => {
          const offersCount = Array.isArray(offers) ? offers.length : 0;
          const appsCount = Array.isArray(apps) ? apps.length : 0;
          const msgCount =
            typeof messages?.count === "number" ? messages.count : 0;
          setInboxUnread(offersCount + appsCount);
          setMessagesUnread(msgCount);
        })
        .catch(() => {
          setInboxUnread(0);
          setMessagesUnread(0);
        });
    };
    loadInboxUnreadRef.current = loadInboxUnread;
    loadInboxUnread();

    let interval: ReturnType<typeof setInterval> | null = null;
    const startInterval = () => {
      if (interval) clearInterval(interval);
      const visible =
        typeof document === "undefined" || document.visibilityState === "visible";
      interval = setInterval(loadInboxUnread, visible ? 5000 : 30000);
    };
    startInterval();

    const onVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        loadInboxUnread();
      }
      startInterval();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      loadInboxUnreadRef.current = () => {};
    };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const unsubscribe = subscribeMessagesBus((event) => {
      if (
        event.type === "messages-read" ||
        event.type === "messages-changed" ||
        event.type === "messages-sent"
      ) {
        loadInboxUnreadRef.current();
      }
    });
    return unsubscribe;
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
      <div className="flex flex-col items-end gap-2">
        {showEmailReminder && (
          <div className="flex max-w-xl items-center gap-2 rounded-lg border border-amber-700/60 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            <span>Please verify your email address to unlock full access.</span>
            <button
              onClick={verifyNowFromReminder}
              disabled={verificationBusy}
              className="rounded border border-amber-600/70 px-2 py-0.5 text-[11px] hover:bg-amber-500/20 disabled:opacity-60"
            >
              {verificationBusy ? "Preparing..." : "Verify now"}
            </button>
            <button
              onClick={acknowledgeEmailReminder}
              className="rounded border border-amber-600/70 px-2 py-0.5 text-[11px] hover:bg-amber-500/20"
            >
              Dismiss
            </button>
          </div>
        )}
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
            title={
              messagesUnread > 0
                ? `${messagesUnread} unread message${messagesUnread === 1 ? "" : "s"}`
                : "Inbox and notifications"
            }
          >
            <span>Inbox</span>
            <span aria-hidden="true">🔔</span>
            {inboxBadge > 0 && (
              <span className="inline-flex min-w-[1.25rem] justify-center rounded-full bg-brand px-1 text-[0.7rem] font-medium text-white">
                {inboxBadge}
              </span>
            )}
            {totalUnread > inboxBadge && (
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
      </div>
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
