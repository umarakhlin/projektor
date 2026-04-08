"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { parseJsonArray } from "@/lib/safe-json";
import { isProfileComplete } from "@/lib/profile-completion";
import { SaveProjectHeart } from "@/components/save-project-heart";

type Project = {
  id: string;
  title: string;
  pitch: string | null;
  stage: string;
  category: string;
  status: string;
  hoursPerWeek: number | null;
  durationMonths: number | null;
  rewardModels: string | null;
  owner: { id: string; name: string | null };
  roles: {
    id: string;
    title: string;
    openings: number;
    filledCount: number;
    requirements: string | null;
  }[];
};

export default function HomePage() {
  const { status } = useSession();
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const [projects, setProjects] = useState<Project[]>([]);
  const [profileReady, setProfileReady] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [stage, setStage] = useState("");
  const [category, setCategory] = useState("");
  const [errorState, setErrorState] = useState<"auth" | "server" | null>(null);

  const showWelcome = status === "unauthenticated";

  async function loadFeed(offsetVal = 0, append = false) {
    const params = new URLSearchParams();
    params.set("limit", "12");
    params.set("offset", String(offsetVal));
    if (stage) params.set("stage", stage);
    if (category) params.set("category", category);

    const res = await fetch(`/api/feed?${params}`);
    if (res.status === 401) {
      setErrorState("auth");
      return;
    }
    if (!res.ok) {
      setErrorState("server");
      return;
    }
    const data = await res.json();
    setErrorState(null);

    setProjects((prev) => (append ? [...prev, ...(data.projects || [])] : data.projects || []));
    setHasMore(data.hasMore ?? false);
    setOffset(offsetVal);
  }

  useEffect(() => {
    if (status !== "authenticated") {
      setSavedIds(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch("/api/profile")
      .then((r) => {
        if (r.status === 401) {
          setErrorState("auth");
          return null;
        }
        if (!r.ok) {
          setErrorState("server");
          return null;
        }
        return r.json();
      })
      .then((profile) => setProfileReady(isProfileComplete(profile)))
      .catch(() => setProfileReady(true));
    fetch("/api/me/saved-projects")
      .then((r) => {
        if (r.status === 401) {
          setErrorState("auth");
          return { projectIds: [] };
        }
        if (!r.ok) {
          setErrorState("server");
          return { projectIds: [] };
        }
        return r.json();
      })
      .then((d: { projectIds?: string[] }) =>
        setSavedIds(new Set(Array.isArray(d.projectIds) ? d.projectIds : []))
      )
      .catch(() => setSavedIds(new Set()));
    loadFeed(0, false).finally(() => setLoading(false));
  }, [stage, category, status]);

  function setProjectSaved(projectId: string, saved: boolean) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (saved) next.add(projectId);
      else next.delete(projectId);
      return next;
    });
  }

  function loadMore() {
    loadFeed(offset + 12, true);
  }

  return (
    <div className="mx-auto max-w-2xl">
      {showWelcome && (
        <div className="mb-10 rounded-xl border border-slate-700 bg-slate-900/60 p-8 text-center">
          <h1 className="mb-6 text-2xl font-semibold text-slate-100">
            Welcome to Projektor
          </h1>
          <div className="flex flex-col items-center gap-3">
            <Link
              href="/auth/signup"
              className="w-full max-w-xs rounded-lg bg-brand px-4 py-3 text-sm font-medium text-white hover:bg-brand-light"
            >
              Sign up
            </Link>
            <Link
              href="/auth/signin"
              className="w-full max-w-xs rounded-lg border border-slate-600 px-4 py-3 text-sm font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-800/50"
            >
              Sign in
            </Link>
            <Link
              href="/explore"
              className="text-sm text-slate-400 underline hover:text-slate-300"
            >
              Browse as a visitor
            </Link>
          </div>
        </div>
      )}

      {!showWelcome && (
        <>
          {!profileReady && (
            <div className="mb-6 rounded-lg border border-brand/30 bg-brand/10 p-4">
              <h2 className="text-sm font-semibold text-brand">Quick start</h2>
              <p className="mt-1 text-sm text-slate-300">
                Complete your profile to get better matches.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <Link href="/profile" className="text-brand hover:underline">
                  1) Add username
                </Link>
                <Link href="/profile" className="text-brand hover:underline">
                  2) Add photo
                </Link>
                <Link href="/profile" className="text-brand hover:underline">
                  3) Pick skills
                </Link>
              </div>
            </div>
          )}
          <div className="mb-6 flex flex-wrap gap-2">
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="">All stages</option>
              <option value="Idea">Idea</option>
              <option value="Validation">Validation</option>
              <option value="Building">Building</option>
              <option value="Launched">Launched</option>
            </select>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="">All categories</option>
              <option value="SaaS">SaaS</option>
              <option value="Hardware">Hardware</option>
              <option value="Creative">Creative</option>
              <option value="NonProfit">Non-profit</option>
              <option value="Other">Other</option>
            </select>
          </div>
          {errorState === "auth" && (
            <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
              Please sign in again to load your feed.
            </div>
          )}
          {errorState === "server" && (
            <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
              We couldn&apos;t load all feed data. Try refreshing the page.
            </div>
          )}

          {loading ? (
            <p className="text-slate-400">Loading…</p>
          ) : projects.length === 0 ? (
            <p className="text-slate-500">No projects yet.</p>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => {
                const rewardModels = parseJsonArray<{ type: string }>(project.rewardModels);
                const openRoles = project.roles.filter(
                  (r) => r.openings - r.filledCount > 0
                );

                return (
                  <div
                    key={project.id}
                    className="relative rounded-lg border border-slate-700 bg-slate-900/50 transition hover:border-slate-600"
                  >
                    <Link
                      href={`/projects/${project.id}`}
                      className="relative z-0 block p-4 pr-14"
                    >
                      <div className="mb-2 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          project.status === "Recruiting"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}
                      >
                        {project.status}
                      </span>
                      <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-400">
                        {project.stage}
                      </span>
                      {rewardModels.slice(0, 2).map((r) => (
                        <span
                          key={r.type}
                          className="rounded-full bg-brand/20 px-2 py-0.5 text-xs text-brand"
                        >
                          {r.type}
                        </span>
                      ))}
                    </div>
                    <h2 className="font-semibold">{project.title}</h2>
                    {project.pitch && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                        {project.pitch}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      {project.owner.name ?? "Unknown"} · {openRoles.length} open role(s)
                      {project.hoursPerWeek != null && project.durationMonths != null &&
                        ` · ${project.hoursPerWeek}h/wk · ${project.durationMonths}mo`}
                    </p>
                    </Link>
                    <div className="pointer-events-none absolute right-1 top-1 z-20">
                      <div className="pointer-events-auto">
                        <SaveProjectHeart
                          projectId={project.id}
                          saved={savedIds.has(project.id)}
                          onChange={(s) => setProjectSaved(project.id, s)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {hasMore && (
                <button
                  onClick={loadMore}
                  className="w-full rounded-lg border border-slate-700 py-3 text-sm text-slate-400 hover:border-slate-600 hover:text-slate-200"
                >
                  Load more
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
