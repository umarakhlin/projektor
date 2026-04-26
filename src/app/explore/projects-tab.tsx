"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { parseJsonArray } from "@/lib/safe-json";
import { FEED_ROLE_TITLE_OPTIONS } from "@/lib/feed-role-titles";
import { SaveProjectHeart } from "@/components/save-project-heart";
import { BionicText } from "@/components/bionic-text";

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

export function ProjectsTab() {
  const { status } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [stage, setStage] = useState("");
  const [category, setCategory] = useState("");
  const [roleType, setRoleType] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const [errorState, setErrorState] = useState<"auth" | "server" | null>(null);

  async function loadFeed(offsetVal = 0, append = false) {
    const params = new URLSearchParams();
    params.set("limit", "20");
    params.set("offset", String(offsetVal));
    if (stage) params.set("stage", stage);
    if (category) params.set("category", category);
    if (roleType) params.set("roleType", roleType);

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

    setProjects((prev) => (append ? [...prev, ...data.projects] : data.projects));
    setHasMore(data.hasMore);
    setOffset(offsetVal);
  }

  useEffect(() => {
    setLoading(true);
    loadFeed(0, false).finally(() => setLoading(false));
  }, [stage, category, roleType]);

  useEffect(() => {
    if (status !== "authenticated") {
      setSavedIds(new Set());
      return;
    }
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
  }, [status]);

  function setProjectSaved(projectId: string, saved: boolean) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (saved) next.add(projectId);
      else next.delete(projectId);
      return next;
    });
  }

  function loadMore() {
    loadFeed(offset + 20, true);
  }

  const hasActiveFilters = Boolean(stage || category || roleType);

  function clearFilters() {
    setStage("");
    setCategory("");
    setRoleType("");
  }

  return (
    <div>
      <p className="mb-4 text-sm leading-relaxed text-slate-400">
        Browse projects that are recruiting. Filter by stage, category, or the type of role they need.
        {status === "authenticated"
          ? " Tap the heart on a card to save it for later."
          : " Sign in to save projects to your list."}
      </p>

      <div className="mb-6 rounded-lg border border-slate-700 bg-slate-900/50 p-4">
        <p className="mb-3 text-sm font-medium text-slate-400">Filters</p>
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Stage</span>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="">All</option>
              <option value="Idea">Idea</option>
              <option value="Validation">Validation</option>
              <option value="Building">Building</option>
              <option value="Launched">Launched</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="">All</option>
              <option value="SaaS">SaaS</option>
              <option value="Hardware">Hardware</option>
              <option value="Creative">Creative</option>
              <option value="NonProfit">Non-profit</option>
              <option value="Other">Other</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Role needed</span>
            <select
              value={roleType}
              onChange={(e) => setRoleType(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              <option value="">All</option>
              {FEED_ROLE_TITLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {errorState === "auth" && (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
          Please sign in again to load your personalized feed.
        </div>
      )}
      {errorState === "server" && (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
          We couldn&apos;t load all data. Try refreshing the page.
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-6 py-10 text-center">
          {hasActiveFilters ? (
            <>
              <p className="text-slate-200">
                No projects match these filters right now.
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Try widening your filters or check back later.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-800/50"
              >
                Clear all filters
              </button>
            </>
          ) : (
            <>
              <p className="text-slate-200">No projects in the catalog yet.</p>
              <p className="mt-2 text-sm text-slate-500">
                When someone publishes a project, it will show up here.
              </p>
              <Link
                href="/create"
                className="mt-5 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light"
              >
                Create a project
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const rewardModels = parseJsonArray<unknown>(project.rewardModels)
              .map((item) => {
                if (item == null || typeof item !== "object") return null;
                const type = (item as { type?: unknown }).type;
                if (typeof type !== "string") return null;
                const normalizedType = type.trim();
                return normalizedType ? { type: normalizedType } : null;
              })
              .filter((item): item is { type: string } => item !== null);
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
                    {rewardModels.map((r) => (
                      <span
                        key={r.type}
                        className="rounded-full bg-brand/20 px-2 py-0.5 text-xs text-brand"
                      >
                        {r.type}
                      </span>
                    ))}
                  </div>
                  <BionicText
                    as="h2"
                    className="font-semibold"
                    text={project.title}
                  />
                  {project.pitch && (
                    <BionicText
                      as="p"
                      className="mt-1 line-clamp-2 text-sm text-slate-400"
                      text={project.pitch}
                    />
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    {project.owner.name ?? "Unknown"} · {openRoles.length} open role(s)
                    {project.hoursPerWeek && project.durationMonths &&
                      ` · ${project.hoursPerWeek}h/wk · ${project.durationMonths}mo`}
                  </p>
                </Link>
                {status === "authenticated" && (
                  <div className="pointer-events-none absolute right-1 top-1 z-20">
                    <div className="pointer-events-auto">
                      <SaveProjectHeart
                        projectId={project.id}
                        saved={savedIds.has(project.id)}
                        onChange={(s) => setProjectSaved(project.id, s)}
                      />
                    </div>
                  </div>
                )}
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
    </div>
  );
}
