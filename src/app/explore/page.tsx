"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

type SavedSearchItem = { id: string; label: string; filters: Record<string, string> };

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

export default function ExplorePage() {
  const { data: session, status } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [stage, setStage] = useState("");
  const [category, setCategory] = useState("");
  const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>([]);
  const [saveLabel, setSaveLabel] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadFeed(offsetVal = 0, append = false) {
    const params = new URLSearchParams();
    params.set("limit", "20");
    params.set("offset", String(offsetVal));
    if (stage) params.set("stage", stage);
    if (category) params.set("category", category);

    const res = await fetch(`/api/feed?${params}`);
    if (!res.ok) return;
    const data = await res.json();

    setProjects((prev) => (append ? [...prev, ...data.projects] : data.projects));
    setHasMore(data.hasMore);
    setOffset(offsetVal);
  }

  useEffect(() => {
    setLoading(true);
    loadFeed(0, false).finally(() => setLoading(false));
  }, [stage, category]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/saved-searches")
      .then((r) => (r.ok ? r.json() : []))
      .then(setSavedSearches)
      .catch(() => setSavedSearches([]));
  }, [status]);

  function applySavedSearch(filters: Record<string, string>) {
    setStage(filters.stage ?? "");
    setCategory(filters.category ?? "");
  }

  async function saveCurrentSearch() {
    if (!saveLabel.trim() || saving) return;
    setSaving(true);
    const res = await fetch("/api/saved-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: saveLabel.trim(),
        filters: { stage, category }
      })
    });
    if (res.ok) {
      const item = await res.json();
      setSavedSearches((prev) => [item, ...prev]);
      setSaveLabel("");
    }
    setSaving(false);
  }

  async function deleteSavedSearch(id: string) {
    await fetch(`/api/saved-searches/${id}`, { method: "DELETE" });
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
  }

  function loadMore() {
    loadFeed(offset + 20, true);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold">Explore</h1>

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
        </div>

        {status === "authenticated" && (
          <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-700 pt-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Save this search</span>
              <input
                value={saveLabel}
                onChange={(e) => setSaveLabel(e.target.value)}
                placeholder="e.g. Building stage SaaS"
                className="w-48 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </label>
            <button
              type="button"
              onClick={saveCurrentSearch}
              disabled={saving || !saveLabel.trim()}
              className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50"
            >
              Save
            </button>
          </div>
        )}

        {status === "authenticated" && savedSearches.length > 0 && (
          <div className="mt-4 border-t border-slate-700 pt-4">
            <p className="mb-2 text-xs text-slate-500">Saved searches</p>
            <div className="flex flex-wrap gap-2">
              {savedSearches.map((s) => (
                <span key={s.id} className="flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-sm">
                  <button
                    type="button"
                    onClick={() => applySavedSearch(s.filters)}
                    className="text-brand hover:underline"
                  >
                    {s.label}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSavedSearch(s.id)}
                    className="text-slate-500 hover:text-red-400"
                    aria-label="Delete"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="text-slate-500">No projects match your filters.</p>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const rewardModels = project.rewardModels
              ? (JSON.parse(project.rewardModels) as { type: string }[])
              : [];
            const openRoles = project.roles.filter(
              (r) => r.openings - r.filledCount > 0
            );

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block rounded-lg border border-slate-700 bg-slate-900/50 p-4 transition hover:border-slate-600"
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
                <h2 className="font-semibold">{project.title}</h2>
                {project.pitch && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                    {project.pitch}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  {project.owner.name ?? "Unknown"} · {openRoles.length} open role(s)
                  {project.hoursPerWeek && project.durationMonths &&
                    ` · ${project.hoursPerWeek}h/wk · ${project.durationMonths}mo`}
                </p>
              </Link>
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
