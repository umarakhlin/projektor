"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BionicText } from "@/components/bionic-text";

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
  direction: "in" | "out";
  partner: { id: string; name: string | null; email: string | null };
};

type Conversation = {
  partner: { id: string; name: string | null; email: string | null };
  messages: DirectMessage[];
  unreadCount: number;
  lastAt: string;
};

export default function InboxPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
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

  const conversations: Conversation[] = (() => {
    const map = new Map<string, Conversation>();
    [...messages]
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      .forEach((m) => {
        const existing = map.get(m.partner.id);
        if (existing) {
          existing.messages.push(m);
          if (m.direction === "in" && !m.readAt) existing.unreadCount += 1;
          if (new Date(m.createdAt) > new Date(existing.lastAt)) {
            existing.lastAt = m.createdAt;
          }
        } else {
          map.set(m.partner.id, {
            partner: m.partner,
            messages: [m],
            unreadCount: m.direction === "in" && !m.readAt ? 1 : 0,
            lastAt: m.createdAt
          });
        }
      });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
    );
  })();


  return (
    <div className="mx-auto max-w-lg">
      <BionicText
        as="h1"
        className="text-xl font-semibold"
        text="Inbox"
      />
      <BionicText
        as="p"
        className="mt-2 mb-6 text-sm leading-relaxed text-slate-400"
        text="Offers are invitations after a creator wants you on their team. Applications are updates for projects you own. Messages are direct messages from other users. Team chat lists projects where you are already a member."
      />

      {inboxEmpty ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-5 text-sm text-slate-400">
          <BionicText
            as="p"
            className="text-slate-200"
            text="Nothing here yet — that is normal when you are getting started."
          />
          <BionicText
            as="p"
            className="mt-2"
            text="Apply to roles on the feed or Explore; when someone sends an offer, it will show up under Offers. Application alerts appear when you own projects; team chat appears after you join a team."
          />
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
            <BionicText
              as="h2"
              className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-500"
              text="Offers"
            />
            {!hasOffers ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-4 text-sm text-slate-400">
                <BionicText
                  as="p"
                  text="No pending offers. When a project owner accepts your application, their invite appears here."
                />
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
                    <BionicText
                      as="h3"
                      className="font-medium"
                      text={`${offer.application.role.project.title} — ${offer.application.role.title}`}
                    />
                    <BionicText
                      as="p"
                      className="text-sm text-slate-400"
                      text={`from ${offer.application.role.project.owner.name ?? "Creator"}`}
                    />
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
            <BionicText
              as="h2"
              className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-500"
              text="Messages"
            />
            {!hasMessages ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-4 text-sm text-slate-400">
                <BionicText
                  as="p"
                  text="No messages yet. Messages you send or receive from Talent appear here."
                />
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => {
                  const last = conv.messages[conv.messages.length - 1];
                  const preview = last
                    ? `${last.direction === "out" ? "You: " : ""}${last.content}`
                    : "";
                  return (
                    <Link
                      key={conv.partner.id}
                      href={`/messages/${conv.partner.id}`}
                      className={`block rounded-lg border bg-slate-900/50 p-3 transition hover:border-slate-600 ${conv.unreadCount > 0 ? "border-brand/40" : "border-slate-700"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs text-slate-300">
                              {(conv.partner.name?.[0] ?? "U").toUpperCase()}
                            </span>
                            <BionicText
                              as="p"
                              className="truncate font-medium text-slate-200"
                              text={conv.partner.name ?? "User"}
                            />
                            {conv.unreadCount > 0 && (
                              <span className="ml-auto rounded-full bg-brand px-2 py-0.5 text-xs font-medium text-white">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 min-w-0 line-clamp-1 text-xs text-slate-400">
                            <BionicText
                              as="span"
                              className="text-xs text-slate-400"
                              dir="auto"
                              text={preview}
                            />
                          </div>
                        </div>
                        <p className="whitespace-nowrap text-[10px] text-slate-500">
                          {new Date(conv.lastAt).toLocaleDateString()}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Application notifications (for project owners) */}
          <section className="mb-8">
            <BionicText
              as="h2"
              className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-500"
              text="Applications"
            />
            {!hasApps ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-4 text-sm text-slate-400">
                <BionicText
                  as="p"
                  text="No new application alerts. When someone applies to your project, a summary shows here."
                />
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
                    <BionicText
                      as="p"
                      className="font-medium text-slate-200"
                      text={`${app.applicantName} applied to ${app.roleTitle} on ${app.projectTitle}`}
                    />
                    <BionicText
                      as="p"
                      className="mt-1 text-xs text-slate-500"
                      text="View applications →"
                    />
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Team chat (projects you're in) */}
          <section>
            <BionicText
              as="h2"
              className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-500"
              text="Team chat"
            />
            {!hasChat ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-4 text-sm text-slate-400">
                <BionicText
                  as="p"
                  text="You are not in any project teams yet. Accept an offer from the Offers section above, then open Team Space from here or the header."
                />
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
                    <BionicText
                      as="p"
                      className="font-medium text-slate-200"
                      text={m.project.title}
                    />
                    <BionicText
                      as="p"
                      className="mt-1 text-xs text-slate-500"
                      text={`Team space & chat · as ${m.role.title} →`}
                    />
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
