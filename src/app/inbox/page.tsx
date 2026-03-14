"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

export default function InboxPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/inbox");
      return;
    }
    if (status !== "authenticated") return;

    fetch("/api/offers")
      .then((res) => (res.ok ? res.json() : []))
      .then(setOffers)
      .finally(() => setLoading(false));
  }, [status, router]);

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

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-xl font-semibold">Inbox</h1>

      {offers.length === 0 ? (
        <p className="text-slate-500">No pending offers.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Offers awaiting your response</p>
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="rounded-lg border border-slate-700 bg-slate-900/50 p-4"
            >
              <h2 className="font-medium">
                {offer.application.role.project.title} — {offer.application.role.title}
              </h2>
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
    </div>
  );
}
