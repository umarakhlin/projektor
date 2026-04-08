"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { parseJsonArray } from "@/lib/safe-json";

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

export default function ProjectApplicationsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<{ title: string } | null>(null);
  const [byRole, setByRole] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<"auth" | "forbidden" | "server" | null>(null);

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function reject(appId: string) {
    setActing(appId);
    await fetch(`/api/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject" })
    });
    router.refresh();
    const data = await fetch(`/api/projects/${projectId}/applications`).then((r) => r.json());
    setByRole(data.byRole ?? []);
    setActing(null);
  }

  async function sendOffer(appId: string) {
    setActing(appId);
    await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: appId })
    });
    router.refresh();
    const data = await fetch(`/api/projects/${projectId}/applications`).then((r) => r.json());
    setByRole(data.byRole ?? []);
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

      {byRole.length === 0 ? (
        <p className="text-slate-500">No applications yet.</p>
      ) : (
        <div className="space-y-8">
          {byRole.map((group) => (
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
                      <p className="mb-2 text-sm text-slate-300">{app.message}</p>
                    )}
                    {app.availability && (
                      <p className="mb-2 text-xs text-slate-500">
                        Availability: {app.availability}
                      </p>
                    )}
                    {linkUrls.length > 0 && (
                      <p className="mb-2 text-xs text-slate-500">
                        Links: {linkUrls.join(", ")}
                      </p>
                    )}
                    {(app.status === "Applied" || app.status === "InReview") && (
                      <div className="mt-3 flex gap-2">
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
