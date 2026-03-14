"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

type Project = {
  id: string;
  title: string;
  status: string;
  stage: string;
  roles: { id: string; title: string; openings: number; filledCount: number }[];
};

type Membership = {
  project: Project;
  role: { title: string };
};

export default function MyProjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [owned, setOwned] = useState<Project[]>([]);
  const [joined, setJoined] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/my-projects");
      return;
    }
    if (status !== "authenticated") return;

    Promise.all([
      fetch("/api/projects").then(async (r) => (r.ok ? (await r.json()) : [])),
      fetch("/api/me/memberships").then(async (r) => (r.ok ? (await r.json()) : [])),
      fetch("/api/me/application-stats").then(async (r) => (r.ok ? (await r.json()) : { byProject: [] }))
    ])
      .then(([projects, memberships, stats]) => {
        setOwned(Array.isArray(projects) ? projects : []);
        setJoined(Array.isArray(memberships) ? memberships : []);
        const map: Record<string, number> = {};
        const byProject = stats && typeof stats === "object" && Array.isArray((stats as { byProject?: unknown }).byProject)
          ? (stats as { byProject: { projectId: string; openApplications: number }[] }).byProject
          : [];
        byProject.forEach((p) => {
          map[p.projectId] = p.openApplications;
        });
        setAppCounts(map);
      })
      .catch(() => {
        setOwned([]);
        setJoined([]);
        setAppCounts({});
      })
      .finally(() => setLoading(false));
  }, [status, router]);

  if (status === "loading" || loading) {
    return <div className="mx-auto max-w-lg text-slate-400">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold">My Projects</h1>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-slate-400">Created</h2>
        {owned.length === 0 ? (
          <p className="text-slate-500">No projects yet.</p>
        ) : (
          <div className="space-y-2">
            {owned.map((p) => {
              const roles = Array.isArray(p.roles) ? p.roles : [];
              const openRoles = roles.filter((r) => (r?.filledCount ?? 0) < (r?.openings ?? 0)).length;
              const openApps = appCounts[p.id] ?? 0;
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="block rounded-lg border border-slate-700 bg-slate-900/50 p-4 transition hover:border-slate-600"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{p.title}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        p.status === "Recruiting"
                          ? "bg-green-500/20 text-green-400"
                          : p.status === "Active"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {roles.length} role(s) · {openRoles} open
                    {openApps > 0 && ` · ${openApps} application${openApps === 1 ? "" : "s"}`}
                  </p>
                  {p.status !== "Draft" && (
                    <Link
                      href={`/projects/${p.id}/applications`}
                      className="mt-2 inline-block text-sm text-brand hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View applications
                    </Link>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-slate-400">Joined</h2>
        {joined.length === 0 ? (
          <p className="text-slate-500">You haven&apos;t joined any projects yet.</p>
        ) : (
          <div className="space-y-2">
            {joined
              .filter((m) => m?.project?.id)
              .map((m) => (
                <Link
                  key={m.project.id}
                  href={`/projects/${m.project.id}`}
                  className="block rounded-lg border border-slate-700 bg-slate-900/50 p-4 transition hover:border-slate-600"
                >
                  <span className="font-medium">{m.project?.title ?? "Project"}</span>
                  <p className="mt-1 text-xs text-slate-500">as {m.role?.title ?? "Member"}</p>
                </Link>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
