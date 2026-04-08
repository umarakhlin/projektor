"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { parseJsonArray } from "@/lib/safe-json";
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

export default function SavedProjectsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/saved");
      return;
    }
    if (status !== "authenticated") return;
    setLoading(true);
    fetch("/api/me/saved-projects?withProjects=1")
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((d: { projects?: Project[] }) =>
        setProjects(Array.isArray(d.projects) ? d.projects : [])
      )
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [status, router]);

  function setProjectSaved(projectId: string, saved: boolean) {
    if (!saved) {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    }
  }

  if (status === "loading" || loading) {
    return <div className="mx-auto max-w-2xl text-slate-400">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <Link
          href="/explore"
          className="inline-flex items-center rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500 hover:text-slate-100"
        >
          ← Go back to the Explorer
        </Link>
      </div>
      <h1 className="mb-2 text-xl font-semibold">Saved projects</h1>
      <p className="mb-6 text-sm text-slate-400">
        Projects you marked with ♥. Tap again on a card to remove from this list.
      </p>

      {projects.length === 0 ? (
        <p className="text-slate-500">
          Nothing saved yet. Browse the{" "}
          <Link href="/" className="text-brand hover:underline">
            feed
          </Link>{" "}
          or{" "}
          <Link href="/explore" className="text-brand hover:underline">
            Explore
          </Link>{" "}
          and tap ♡ on a project.
        </p>
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
                          : project.status === "Active"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-slate-600 text-slate-400"
                      }`}
                    >
                      {project.status}
                    </span>
                    <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-400">
                      {project.stage}
                    </span>
                    {rewardModels.slice(0, 4).map((r) => (
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
                    <p className="mt-1 line-clamp-2 text-sm text-slate-400">{project.pitch}</p>
                  )}
                  <p className="mt-2 text-xs text-slate-500">
                    {project.owner.name ?? "Unknown"} · {openRoles.length} open role(s)
                  </p>
                </Link>
                <div className="pointer-events-none absolute right-1 top-1 z-20">
                  <div className="pointer-events-auto">
                    <SaveProjectHeart
                      projectId={project.id}
                      saved
                      onChange={(s) => setProjectSaved(project.id, s)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
