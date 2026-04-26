"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { parseJsonArray } from "@/lib/safe-json";
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
      <h1 className="text-xl font-semibold">Saved projects</h1>
      <p className="mt-2 mb-4 text-sm leading-relaxed text-slate-400">
        A personal shortlist of projects you care about. Use the heart on any card in the feed or Explore
        to add or remove items here.
      </p>
      <div className="mb-6">
        <Link
          href="/explore"
          className="inline-flex items-center rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500 hover:text-slate-100"
        >
          ← Back to Explore
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-8 text-center text-sm text-slate-400">
          <p className="text-slate-200">Nothing saved yet</p>
          <p className="mt-2">
            Browse the home feed or Explore and tap the heart on a project to save it for later.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/explore"
              className="inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light"
            >
              Explore projects
            </Link>
            <Link
              href="/"
              className="inline-flex rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
            >
              Home feed
            </Link>
          </div>
        </div>
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

      <nav
        className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-800 pt-6 text-sm text-slate-500"
        aria-label="Related pages"
      >
        <Link href="/" className="hover:text-slate-200">
          Home feed
        </Link>
        <Link href="/inbox" className="hover:text-slate-200">
          Inbox
        </Link>
        <Link href="/profile" className="hover:text-slate-200">
          Profile
        </Link>
      </nav>
    </div>
  );
}
