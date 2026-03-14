"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

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
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    setAccessDenied(false);
    fetch(`/api/projects/${projectId}/applications`)
      .then((res) => {
        if (res.status === 403) {
          setAccessDenied(true);
          return { project: null, byRole: [] };
        }
        if (!res.ok) return Promise.reject(res);
        return res.json();
      })
      .then((data) => {
        setProject(data.project);
        setByRole(data.byRole ?? []);
      })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [projectId, router]);

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

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-amber-400">
          Only the project owner can view applications. Make sure you are signed in with the account that created this project.
        </p>
        <Link href="/" className="mt-4 block text-brand hover:underline">← Back to feed</Link>
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
                {group.applications.map((app) => (
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
                    {app.links && (
                      <p className="mb-2 text-xs text-slate-500">
                        Links: {(JSON.parse(app.links) as { url: string }[]).map((l) => l.url).join(", ")}
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
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
