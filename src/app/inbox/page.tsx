"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Offer = {
  id: string;
  status: string;
  application: {
    id: string;
    role: {
      title: string;
      project: {
        id: string;
        title: string;
        owner: { name: string | null };
      };
    };
  };
};

type AppNotification = {
  id: string;
  applicantName: string;
  roleTitle: string;
  projectId: string;
  projectTitle: string;
  status: string;
  createdAt: string;
};

type Membership = { project: { id: string; title: string }; role: { title: string } };

type DirectMessage = {
  id: string;
  content: string;
  readAt: string | null;
  createdAt: string;
  sender: { id: string; name: string | null; email: string | null };
};

export default function InboxPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<"auth" | "forbidden" | "server" | null>(null);

  const loadData = useCallback(() => {
    setErrorState(null);
    setLoading(true);

    async function fetchOrThrow<T>(url: string, fallback: T): Promise<T> {
      try {
        const res = await fetch(url);
        if (res.status === 401) throw new Error("AUTH_401");
        if (res.status === 403) throw new Error("AUTH_403");
        if (res.status >= 500) throw new Error("SERVER_5XX");
        if (!res.ok) return fallback;
        return (await res.json()) as T;
      } catch (e) {
        if (e instanceof Error && (e.message === "AUTH_401" || e.message === "AUTH_403" || e.message === "SERVER_5XX")) {
          throw e;
        }
        throw new Error("NETWORK_ERROR");
      }
    }

    Promise.all([
      fetchOrThrow<Offer[]>("/api/offers", []),
      fetchOrThrow<AppNotification[]>("/api/me/application-notifications", []),
      fetchOrThrow<Membership[]>("/api/me/memberships", []),
      fetchOrThrow<{ messages: DirectMessage[] }>("/api/direct-messages", { messages: [] })
    ])
      .then(([offersList, apps, mems, dm]) => {
        setOffers(Array.isArray(offersList) ? offersList : []);
        setAppNotifications(Array.isArray(apps) ? apps : []);
        setMemberships(Array.isArray(mems) ? mems : []);
        setMessages(Array.isArray(dm?.messages) ? dm.messages : []);
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : "";
        if (message === "AUTH_401") setErrorState("auth");
        else if (message === "AUTH_403") setErrorState("forbidden");
        else setErrorState("server");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/inbox");
      return;
    }
    if (status !== "authenticated") return;
    loadData();
  }, [status, router, loadData]);

  async function respond(offerId: string, action: "accept" | "decline") {
    setActing(offerId);
    const res = await fetch(`/api/offers/${offerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    if (res.ok) {
      const data = await res.json();
      setOffers((prev) => prev.filter((o) => o.id !== offerId));
      if (action === "accept" && data.projectId) {
        router.push(`/projects/${data.projectId}`);
      }
    }
    setActing(null);
  }

  if (status === "loading" || loading) {
    return <div className="mx-auto max-w-lg text-slate-400">Loading…</div>;
  }

  if (errorState === "auth") {
    return (
      <div className="mx-auto max-w-lg">
        <p className="text-amber-400">Please sign in to view your inbox.</p>
        <Link href="/auth/signin?callbackUrl=/inbox" className="mt-4 inline-block text-brand hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  if (errorState === "forbidden") {
    return (
      <div className="mx-auto max-w-lg">
        <p className="text-red-400">You don&apos;t have access to view this page.</p>
      </div>
    );
  }

  if (errorState === "server") {
    return (
      <div className="mx-auto max-w-lg">
        <p className="text-amber-400">We couldn&apos;t load your inbox. Please try again.</p>
        <button
          type="button"
          onClick={loadData}
          className="mt-4 rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500 hover:text-slate-100"
        >
          Retry
        </button>
      </div>
    );
  }

  const hasOffers = offers.length > 0;
  const hasApps = appNotifications.length > 0;
  const hasChat = memberships.length > 0;
  const hasMessages = messages.length > 0;

  const inboxEmpty = !hasOffers && !hasApps && !hasChat && !hasMessages;

  async function markMessageRead(id: string) {
    await fetch(`/api/direct-messages/${id}/read`, { method: "POST" }).catch(
      () => {}
    );
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, readAt: new Date().toISOString() } : m))
    );
  }

  function openReply(messageId: string) {
    setReplyOpenId(messageId);
    setReplyContent("");
  }

  async function sendReply(recipientId: string) {
    const content = replyContent.trim();
    if (!content) return;
    setReplyBusy(true);
    const res = await fetch(`/api/direct-messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId, content })
    });
    setReplyBusy(false);
    if (res.ok) {
      setReplyOpenId(null);
      setReplyContent("");
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-semibold">Inbox</h1>
      <p className="mt-2 mb-6 text-sm leading-relaxed text-slate-400">
        <strong className="font-medium text-slate-300">Offers</strong> are invitations after a creator
        wants you on their team. <strong className="font-medium text-slate-300">Applications</strong>{" "}
        are updates for projects you own.{" "}
        <strong className="font-medium text-slate-300">Messages</strong> are direct messages from other
        users. <strong className="font-medium text-slate-300">Team chat</strong>{" "}
        lists projects where you are already a member.
      </p>

      {inboxEmpty ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-5 text-sm text-slate-400">
          <p className="text-slate-200">Nothing here yet — that is normal when you are getting started.</p>
          <p className="mt-2">
            Apply to roles on the feed or Explore; when someone sends an offer, it will show up under
            Offers. Application alerts appear when you own projects; team chat appears after you join a
            team.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/explore"
              className="inline-flex rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-light"
            >
              Explore projects
            </Link>
            <Link
              href="/"
              className="inline-flex rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-500"
            >
              Home feed
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Offers */}
          <section className="mb-8">
            <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-500">
              Offers
            </h2>
            {!hasOffers ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-4 text-sm text-slate-400">
                <p>
                  No pending offers. When a project owner accepts your application, their invite appears
                  here.
                </p>
                <Link href="/explore" className="mt-2 inline-block font-medium text-brand hover:underline">
                  Browse projects to apply →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {offers.map((offer) => (
                  <div
                    key={offer.id}
                    className="rounded-lg border border-slate-700 bg-slate-900/50 p-4"
                  >
                    <h3 className="font-medium">
                      {offer.application.role.project.title} — {offer.application.role.title}
                    </h3>
                    <p className="text-sm text-slate-400">
                      from {offer.application.role.project.owner.name ?? "Creator"}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => respond(offer.id, "accept")}
                        disabled={!!acting}
                        className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50"
                      >
                        {acting === offer.id ? "Processing…" : "Accept"}
                      </button>
                      <button
                        onClick={() => respond(offer.id, "decline")}
                        disabled={!!acting}
                        className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-400 hover:text-red-400 disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Direct messages */}
          <section className="mb-8">
            <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-500">
              Messages
            </h2>
            {!hasMessages ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-4 text-sm text-slate-400">
                <p>
                  No messages yet. When someone messages you from Talent or your
                  profile, it appears here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((m) => {
                  const isUnread = !m.readAt;
                  const isReplyOpen = replyOpenId === m.id;
                  return (
                    <div
                      key={m.id}
                      className={`rounded-lg border bg-slate-900/50 p-3 ${isUnread ? "border-brand/40" : "border-slate-700"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-200">
                            {m.sender.name ?? "User"}
                            {isUnread && (
                              <span className="ml-2 rounded-full bg-brand/20 px-2 py-0.5 text-xs text-brand">
                                New
                              </span>
                            )}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">
                            {m.content}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {new Date(m.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {isUnread && (
                            <button
                              type="button"
                              onClick={() => markMessageRead(m.id)}
                              className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-slate-500"
                            >
                              Mark read
                            </button>
                          )}
                          {!isReplyOpen && (
                            <button
                              type="button"
                              onClick={() => openReply(m.id)}
                              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-light"
                            >
                              Reply
                            </button>
                          )}
                        </div>
                      </div>
                      {isReplyOpen && (
                        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                          <textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            rows={3}
                            maxLength={2000}
                            placeholder="Write a reply..."
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                          />
                          <div className="mt-2 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setReplyOpenId(null);
                                setReplyContent("");
                              }}
                              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-500"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={replyBusy || !replyContent.trim()}
                              onClick={() => sendReply(m.sender.id)}
                              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-light disabled:opacity-50"
                            >
                              {replyBusy ? "Sending..." : "Send reply"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Application notifications (for project owners) */}
          <section className="mb-8">
            <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-500">
              Applications
            </h2>
            {!hasApps ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-4 text-sm text-slate-400">
                <p>No new application alerts. When someone applies to your project, a summary shows here.</p>
                <Link href="/my-projects" className="mt-2 inline-block font-medium text-brand hover:underline">
                  My projects →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {appNotifications.map((app) => (
                  <Link
                    key={app.id}
                    href={`/projects/${app.projectId}/applications`}
                    className="block rounded-lg border border-slate-700 bg-slate-900/50 p-3 transition hover:border-slate-600"
                  >
                    <p className="font-medium text-slate-200">
                      {app.applicantName} applied to <span className="text-brand">{app.roleTitle}</span> on{" "}
                      {app.projectTitle}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">View applications →</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Team chat (projects you're in) */}
          <section>
            <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-500">
              Team chat
            </h2>
            {!hasChat ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-4 text-sm text-slate-400">
                <p>
                  You are not in any project teams yet. Accept an offer from the Offers section above, then
                  open Team Space from here or the header.
                </p>
                <Link href="/team-space" className="mt-2 inline-block font-medium text-brand hover:underline">
                  Team Space hub →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {memberships.map((m) => (
                  <Link
                    key={m.project.id}
                    href={`/projects/${m.project.id}/space`}
                    className="block rounded-lg border border-slate-700 bg-slate-900/50 p-3 transition hover:border-slate-600"
                  >
                    <p className="font-medium text-slate-200">{m.project.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Team space & chat · as {m.role.title} →
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
