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

  if (teamAccess.length === 0) {
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-xl font-semibold">Team Space</h1>
        <p className="text-slate-500">
          You don’t have any team spaces yet. Join a project or create one, then open its team space (updates, tasks, chat).
        </p>
        <Link href="/inbox" className="mt-4 inline-block text-brand hover:underline">
          Go to Inbox →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-xl font-semibold">Team Space</h1>
      <p className="mb-4 text-sm text-slate-400">
        Pick a project to open its team space (updates, tasks, chat).
      </p>
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
    </div>
  );
}
