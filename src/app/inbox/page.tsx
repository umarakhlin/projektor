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

export default function InboxPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [appNotifications, setAppNotifications] = useState<AppNotification[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
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
      fetchOrThrow<Membership[]>("/api/me/memberships", [])
    ])
      .then(([offersList, apps, mems]) => {
        setOffers(Array.isArray(offersList) ? offersList : []);
        setAppNotifications(Array.isArray(apps) ? apps : []);
        setMemberships(Array.isArray(mems) ? mems : []);
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

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-xl font-semibold">Inbox</h1>

      {/* Offers */}
      <section className="mb-8">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-500">
          Offers
        </h2>
        {!hasOffers ? (
          <p className="text-slate-500">No pending offers.</p>
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

      {/* Application notifications (for project owners) */}
      <section className="mb-8">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-500">
          Applications
        </h2>
        {!hasApps ? (
          <p className="text-slate-500">No new applications.</p>
        ) : (
          <div className="space-y-2">
            {appNotifications.map((app) => (
              <Link
                key={app.id}
                href={`/projects/${app.projectId}/applications`}
                className="block rounded-lg border border-slate-700 bg-slate-900/50 p-3 transition hover:border-slate-600"
              >
                <p className="font-medium text-slate-200">
                  {app.applicantName} applied to <span className="text-brand">{app.roleTitle}</span> on {app.projectTitle}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  View applications →
                </p>
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
          <p className="text-slate-500">You’re not in any project teams yet. Accept an offer to join and use team chat.</p>
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
    </div>
  );
}
