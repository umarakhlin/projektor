"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { parseJsonArray } from "@/lib/safe-json";
import { BionicText } from "@/components/bionic-text";

type Application = {
  id: string;
  message: string | null;
  links: string | null;
  availability: string | null;
  status: string;
  applicant: {
    id: string;
    name: string | null;
    email: string;
  };
};

type Group = {
  role: { id: string; title: string };
  applications: Application[];
};

type StatusFilter = "all" | "active" | "closed";

export default function ProjectApplicationsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<{ title: string } | null>(null);
  const [byRole, setByRole] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<"auth" | "forbidden" | "server" | null>(null);
  const [actionError, setActionError] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  function getApplicationLinkUrls(rawLinks: string | null): string[] {
    const parsed = parseJsonArray<{ url?: unknown }>(rawLinks);
    const sanitized = parsed.flatMap((item) => {
      const trimmed = typeof item?.url === "string" ? item.url.trim() : "";
      if (!trimmed) return [];
      try {
        const parsedUrl = new URL(trimmed);
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") return [];
        return [parsedUrl.toString()];
      } catch {
        return [];
      }
    });
    return Array.from(new Set(sanitized));
  }

  const loadData = useCallback(() => {
    setErrorState(null);
    setLoading(true);
    fetch(`/api/projects/${projectId}/applications`)
      .then((res) => {
        if (res.status === 401) throw new Error("AUTH_401");
        if (res.status === 403) throw new Error("AUTH_403");
        if (res.status >= 500) throw new Error("SERVER_5XX");
        if (!res.ok) throw new Error("NETWORK_ERROR");
        return res.json();
      })
      .then((data) => {
        setProject(data.project);
        setByRole(data.byRole ?? []);
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : "";
        if (message === "AUTH_401") setErrorState("auth");
        else if (message === "AUTH_403") setErrorState("forbidden");
        else setErrorState("server");
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  function statusBucket(status: string): "active" | "closed" {
    return status === "Applied" || status === "InReview" ? "active" : "closed";
  }

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function markInReview(appId: string) {
    setActionError("");
    setActing(appId);
    const res = await fetch(`/api/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "in_review" })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(data.error ?? "Could not mark as in review.");
      setActing(null);
      return;
    }
    await loadData();
    setActing(null);
  }

  async function reject(appId: string) {
    setActionError("");
    setActing(appId);
    const res = await fetch(`/api/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject" })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(data.error ?? "Could not reject application.");
      setActing(null);
      return;
    }
    await loadData();
    setActing(null);
  }

  async function sendOffer(appId: string) {
    setActionError("");
    setActing(appId);
    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: appId })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setActionError(data.error ?? "Could not send offer.");
      setActing(null);
      return;
    }
    await loadData();
    setActing(null);
  }

  if (loading) {
    return <div className="mx-auto max-w-2xl text-slate-400">Loading…</div>;
  }

  if (errorState === "auth") {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-amber-400">Please sign in to view project applications.</p>
        <Link href={`/auth/signin?callbackUrl=/projects/${projectId}/applications`} className="mt-4 block text-brand hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  if (errorState === "forbidden") {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-amber-400">
          Only the project owner can view applications. Make sure you are signed in with the account that created this project.
        </p>
        <Link href="/" className="mt-4 block text-brand hover:underline">← Back to feed</Link>
      </div>
    );
  }

  if (errorState === "server") {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-amber-400">We couldn&apos;t load applications. Please try again.</p>
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

  const filteredByRole = byRole
    .map((group) => ({
      ...group,
      applications: group.applications.filter((app) =>
        statusFilter === "all" ? true : statusBucket(app.status) === statusFilter
      )
    }))
    .filter((group) => group.applications.length > 0);

  const activeCount = byRole.reduce(
    (sum, group) =>
      sum +
      group.applications.filter((app) => statusBucket(app.status) === "active").length,
    0
  );
  const closedCount = byRole.reduce(
    (sum, group) =>
      sum +
      group.applications.filter((app) => statusBucket(app.status) === "closed").length,
    0
  );

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-xl font-semibold">Applications</h1>
      <p className="mb-6 text-sm text-slate-400">{project?.title}</p>

      <Link
        href={`/projects/${projectId}`}
        className="mb-6 block text-sm text-brand hover:underline"
      >
        ← Back to project
      </Link>
      <div className="mb-6 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
        <p className="text-sm text-slate-300">
          Review applications, move strong candidates to{" "}
          <span className="font-medium text-slate-100">InReview</span>, and send offers when ready.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-md px-3 py-1.5 text-xs ${
              statusFilter === "all"
                ? "bg-brand text-white"
                : "border border-slate-700 text-slate-400 hover:border-slate-600"
            }`}
          >
            All ({activeCount + closedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`rounded-md px-3 py-1.5 text-xs ${
              statusFilter === "active"
                ? "bg-brand text-white"
                : "border border-slate-700 text-slate-400 hover:border-slate-600"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("closed")}
            className={`rounded-md px-3 py-1.5 text-xs ${
              statusFilter === "closed"
                ? "bg-brand text-white"
                : "border border-slate-700 text-slate-400 hover:border-slate-600"
            }`}
          >
            Closed ({closedCount})
          </button>
        </div>
      </div>
      {actionError && (
        <div className="mb-4 rounded-lg border border-red-700/50 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {actionError}
        </div>
      )}

      {filteredByRole.length === 0 ? (
        <p className="text-slate-500">
          {statusFilter === "all"
            ? "No applications yet."
            : `No ${statusFilter} applications right now.`}
        </p>
      ) : (
        <div className="space-y-8">
          {filteredByRole.map((group) => (
            <div key={group.role.id}>
              <h2 className="mb-3 font-medium">{group.role.title}</h2>
              <div className="space-y-4">
                {group.applications.map((app) => {
                  const linkUrls = getApplicationLinkUrls(app.links);
                  return (
                    <div
                      key={app.id}
                      className="rounded-lg border border-slate-700 bg-slate-900/50 p-4"
                    >
                    <div className="mb-2 flex items-center justify-between">
                      <Link
                        href={`/profile/${app.applicant.id}`}
                        className="font-medium text-brand hover:underline"
                      >
                        {app.applicant.name ?? app.applicant.email}
                      </Link>
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          app.status === "Offered"
                            ? "bg-brand/20 text-brand"
                            : app.status === "Accepted"
                              ? "bg-green-500/20 text-green-400"
                              : app.status === "Rejected" || app.status === "Declined"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-slate-700 text-slate-400"
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>
                    {app.message && (
                      <BionicText
                        as="p"
                        className="mb-2 text-sm text-slate-300"
                        dir="auto"
                        text={app.message}
                      />
                    )}
                    {app.availability && (
                      <p className="mb-2 text-xs text-slate-500">
                        Availability: {app.availability}
                      </p>
                    )}
                    {linkUrls.length > 0 && (
                      <div className="mb-2 text-xs text-slate-500">
                        Links:{" "}
                        {linkUrls.map((url, idx) => (
                          <span key={url}>
                            {idx > 0 ? ", " : ""}
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand hover:underline"
                            >
                              open
                            </a>
                          </span>
                        ))}
                      </div>
                    )}
                    {(app.status === "Applied" || app.status === "InReview") && (
                      <div className="mt-3 flex gap-2">
                        {app.status === "Applied" && (
                          <button
                            onClick={() => markInReview(app.id)}
                            disabled={!!acting}
                            className="rounded border border-slate-600 px-3 py-1 text-sm text-slate-200 hover:border-slate-500 disabled:opacity-50"
                          >
                            {acting === app.id ? "Saving…" : "Mark in review"}
                          </button>
                        )}
                        <button
                          onClick={() => sendOffer(app.id)}
                          disabled={!!acting}
                          className="rounded bg-brand px-3 py-1 text-sm text-white hover:bg-brand-light disabled:opacity-50"
                        >
                          {acting === app.id ? "Sending…" : "Send offer"}
                        </button>
                        <button
                          onClick={() => reject(app.id)}
                          disabled={!!acting}
                          className="rounded border border-slate-600 px-3 py-1 text-sm text-slate-400 hover:text-red-400 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
