"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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

type ApplicationStatsResponse = {
  byProject: { projectId: string; openApplications: number }[];
};

export default function MyProjectsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [owned, setOwned] = useState<Project[]>([]);
  const [joined, setJoined] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});
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
      fetchOrThrow<Project[]>("/api/projects", []),
      fetchOrThrow<Membership[]>("/api/me/memberships", []),
      fetchOrThrow<ApplicationStatsResponse>("/api/me/application-stats", { byProject: [] })
    ])
      .then(([projects, memberships, stats]) => {
        setOwned(Array.isArray(projects) ? projects : []);
        setJoined(Array.isArray(memberships) ? memberships : []);
        const map: Record<string, number> = {};
        const byProject = Array.isArray(stats.byProject) ? stats.byProject : [];
        byProject.forEach((p) => {
          map[p.projectId] = p.openApplications;
        });
        setAppCounts(map);
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
      router.push("/auth/signin?callbackUrl=/my-projects");
      return;
    }
    if (status !== "authenticated") return;
    loadData();
  }, [status, router, loadData]);

  if (status === "loading" || loading) {
    return <div className="mx-auto max-w-lg text-slate-400">Loading…</div>;
  }

  if (errorState === "auth") {
    return (
      <div className="mx-auto max-w-lg">
        <p className="text-amber-400">Please sign in to view your projects.</p>
        <Link href="/auth/signin?callbackUrl=/my-projects" className="mt-4 inline-block text-brand hover:underline">
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
        <p className="text-amber-400">We couldn&apos;t load your projects. Please try again.</p>
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

  const savedDrafts = owned.filter((p) => p.status === "Draft");
  const createdLive = owned.filter((p) => p.status !== "Draft");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold">My Projects</h1>
      <p className="mt-2 mb-6 text-sm leading-relaxed text-slate-400">
        Drafts you have not published yet, projects you run, and teams you joined — all in one place.
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-slate-400">Saved drafts</h2>
        {savedDrafts.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-6 text-sm text-slate-400">
            <p>No drafts yet. Start a project and you can leave anytime — we keep your progress.</p>
            <Link
              href="/create"
              className="mt-3 inline-block text-sm font-medium text-brand hover:underline"
            >
              Start creating →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {savedDrafts.map((p) => {
              const roles = Array.isArray(p.roles) ? p.roles : [];
              return (
                <Link
                  key={p.id}
                  href={`/create?draft=${encodeURIComponent(p.id)}`}
                  className="block rounded-lg border border-slate-700 bg-slate-900/50 p-4 transition hover:border-slate-600"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{p.title || "Untitled draft"}</span>
                    <span className="rounded px-2 py-0.5 text-xs bg-slate-700 text-slate-300">
                      Draft
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {roles.length} role(s) planned · Saved but not launched yet
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-slate-400">Created</h2>
        {createdLive.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-6 text-sm text-slate-400">
            <p>
              Nothing published yet. When you launch from the create flow, your live projects appear here.
            </p>
            <Link
              href="/create"
              className="mt-3 inline-block text-sm font-medium text-brand hover:underline"
            >
              Create a project →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {createdLive.map((p) => {
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
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-6 text-sm text-slate-400">
            <p>You are not on a team yet. Explore projects and apply to a role that fits.</p>
            <Link
              href="/explore"
              className="mt-3 inline-block text-sm font-medium text-brand hover:underline"
            >
              Explore projects →
            </Link>
          </div>
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
                  <Link
                    href={`/projects/${m.project.id}/space`}
                    className="mt-2 inline-block text-sm text-brand hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open team space
                  </Link>
                </Link>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
