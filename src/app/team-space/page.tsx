"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

type Membership = {
  project: { id: string; title: string };
  role: { title: string };
};

type OwnedProject = { id: string; title: string };

type TeamAccess = {
  projectId: string;
  projectTitle: string;
  roleLabel: string;
};

export default function TeamSpacePage() {
  const { status } = useSession();
  const router = useRouter();
  const [teamAccess, setTeamAccess] = useState<TeamAccess[]>([]);
  const [unreadByProject, setUnreadByProject] = useState<Record<string, number>>(
    {}
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/team-space");
      return;
    }
    if (status !== "authenticated") return;

    Promise.all([
      fetch("/api/me/memberships").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/projects").then((r) => (r.ok ? r.json() : []))
    ])
      .then(([membershipData, ownedData]) => {
        const memberships = Array.isArray(membershipData)
          ? (membershipData as Membership[])
          : [];
        const ownedProjects = Array.isArray(ownedData)
          ? (ownedData as OwnedProject[])
          : [];

        const map = new Map<string, TeamAccess>();

        // Owned projects should always be accessible in Team Space.
        ownedProjects.forEach((p) => {
          if (!p?.id) return;
          map.set(p.id, {
            projectId: p.id,
            projectTitle: p.title ?? "Project",
            roleLabel: "Owner"
          });
        });

        // Joined projects as team member.
        memberships.forEach((m) => {
          const id = m?.project?.id;
          if (!id) return;
          if (!map.has(id)) {
            map.set(id, {
              projectId: id,
              projectTitle: m.project.title ?? "Project",
              roleLabel: m.role?.title ?? "Member"
            });
          }
        });

        const list = Array.from(map.values());
        setTeamAccess(list);
      })
      .finally(() => setLoading(false));
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") {
      setUnreadByProject({});
      return;
    }

    const loadUnread = () => {
      fetch("/api/me/team-space-notifications")
        .then((r) => (r.ok ? r.json() : { byProject: [] }))
        .then((d: { byProject?: { projectId: string; unread: number }[] }) => {
          const list = Array.isArray(d.byProject) ? d.byProject : [];
          const next: Record<string, number> = {};
          list.forEach((item) => {
            if (item?.projectId && typeof item.unread === "number" && item.unread > 0) {
              next[item.projectId] = item.unread;
            }
          });
          setUnreadByProject(next);
        })
        .catch(() => setUnreadByProject({}));
    };

    loadUnread();
    const interval = setInterval(loadUnread, 10000);
    return () => clearInterval(interval);
  }, [status]);

  if (status === "loading" || loading) {
    return <div className="mx-auto max-w-lg text-slate-400">Loading…</div>;
  }

  const empty = teamAccess.length === 0;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-semibold">Team Space</h1>
      <p className="mt-2 mb-6 text-sm leading-relaxed text-slate-400">
        Each project you <strong className="font-medium text-slate-300">own</strong> or{" "}
        <strong className="font-medium text-slate-300">joined</strong> has a shared space: updates, tasks,
        and chat. Pick one below to jump in. Unread counts refresh about every ten seconds.
      </p>

      {empty ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-6 text-sm text-slate-400">
          <p className="text-slate-200">No team spaces yet</p>
          <p className="mt-2">
            Create a project, publish it, or accept an offer from your Inbox. Then this hub lists every
            project where you can use Team Space.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/create"
              className="inline-flex rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-light"
            >
              Create a project
            </Link>
            <Link
              href="/explore"
              className="inline-flex rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-500"
            >
              Explore
            </Link>
            <Link
              href="/inbox"
              className="inline-flex rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-500"
            >
              Inbox
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {teamAccess.map((m) => (
            <Link
              key={m.projectId}
              href={`/projects/${m.projectId}/space`}
              className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 p-4 transition hover:border-brand/50 hover:bg-slate-800/50"
            >
              <span className="font-medium">{m.projectTitle}</span>
              <span className="flex items-center gap-2 text-sm text-slate-500">
                <span>as {m.roleLabel}</span>
                {(unreadByProject[m.projectId] ?? 0) > 0 && (
                  <span className="inline-flex min-w-[1.25rem] justify-center rounded-full bg-brand px-1 text-[0.7rem] font-medium text-white">
                    {unreadByProject[m.projectId]}
                  </span>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}

      <nav
        className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-800 pt-6 text-sm text-slate-500"
        aria-label="Related pages"
      >
        <Link href="/inbox" className="hover:text-slate-200">
          Inbox
        </Link>
        <Link href="/my-projects" className="hover:text-slate-200">
          My projects
        </Link>
        <Link href="/" className="hover:text-slate-200">
          Home feed
        </Link>
      </nav>
    </div>
  );
}
