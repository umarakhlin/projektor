"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Role = {
  id: string;
  title: string;
  openings: number;
  filledCount: number;
  state: string;
};

type OwnerProject = {
  id: string;
  title: string;
  status: string;
  roles: Role[];
};

type TalentUser = {
  id: string;
  name: string | null;
  email?: string;
  availability: string | null;
  skills: string[];
  avatarUrl?: string;
  matchScore: number | null;
  matchedSkills: string[];
};

export default function TalentPage() {
  const { status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<OwnerProject[]>([]);
  const [users, setUsers] = useState<TalentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [note, setNote] = useState("");
  const [inviteBusyId, setInviteBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [roleRequirements, setRoleRequirements] = useState<string[]>([]);
  const [minMatch, setMinMatch] = useState<number>(0);
  const [onlyWithAvailability, setOnlyWithAvailability] = useState<boolean>(false);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId]
  );

  const openRoles = useMemo(() => {
    if (!selectedProject) return [];
    return selectedProject.roles.filter(
      (r) => r.state !== "Filled" && r.openings - r.filledCount > 0
    );
  }, [selectedProject]);

  const visibleUsers = useMemo(() => {
    return users.filter((u) => {
      const passesMatch =
        minMatch <= 0 || (u.matchScore != null && u.matchScore >= minMatch);
      const passesAvailability =
        !onlyWithAvailability || Boolean(u.availability?.trim());
      return passesMatch && passesAvailability;
    });
  }, [users, minMatch, onlyWithAvailability]);

  async function loadUsers(nextProjectId: string, nextRoleId: string, q: string) {
    const params = new URLSearchParams();
    if (nextProjectId) params.set("projectId", nextProjectId);
    if (nextRoleId) params.set("roleId", nextRoleId);
    if (q.trim()) params.set("q", q.trim());

    const res = await fetch(`/api/talent?${params.toString()}`);
    if (!res.ok) {
      throw new Error("Could not load users right now.");
    }
    const data = await res.json();
    setUsers(Array.isArray(data.users) ? data.users : []);
    setRoleRequirements(
      Array.isArray(data.roleRequirements) ? data.roleRequirements : []
    );
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/talent");
      return;
    }
    if (status !== "authenticated") return;

    async function loadInit() {
      setLoading(true);
      setError("");
      try {
        const projectsRes = await fetch("/api/projects");
        if (!projectsRes.ok) throw new Error("Could not load your projects.");
        const allProjects = (await projectsRes.json()) as OwnerProject[];
        const inviteProjects = (Array.isArray(allProjects) ? allProjects : []).filter(
          (p) => p.status === "Recruiting" || p.status === "Active"
        );
        setProjects(inviteProjects);

        const firstProjectId = inviteProjects[0]?.id ?? "";
        setProjectId(firstProjectId);
        const firstRoleId =
          inviteProjects[0]?.roles?.find((r) => r.state !== "Filled" && r.openings - r.filledCount > 0)
            ?.id ?? "";
        setRoleId(firstRoleId);
        await loadUsers(firstProjectId, firstRoleId, "");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load talent.");
      } finally {
        setLoading(false);
      }
    }
    void loadInit();
  }, [status, router]);

  useEffect(() => {
    if (!projectId) return;
    const firstOpenRoleId = openRoles[0]?.id ?? "";
    if (!openRoles.some((r) => r.id === roleId)) {
      setRoleId(firstOpenRoleId);
    }
  }, [projectId, openRoles, roleId]);

  useEffect(() => {
    if (!projectId || !roleId || loading) return;
    void loadUsers(projectId, roleId, query).catch(() => {
      setError("Could not refresh users for selected role.");
    });
  }, [projectId, roleId]);

  async function refreshUsers() {
    setError("");
    setSuccess("");
    try {
      await loadUsers(projectId, roleId, query);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh users.");
    }
  }

  function resetFilters() {
    setMinMatch(0);
    setOnlyWithAvailability(false);
    setQuery("");
    setError("");
  }

  async function sendInvite(userId: string) {
    if (!projectId || !roleId) {
      setError("Choose a project and an open role first.");
      return;
    }
    setInviteBusyId(userId);
    setError("");
    setSuccess("");
    const res = await fetch(`/api/projects/${projectId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        roleId,
        note: note.trim() || undefined
      })
    });
    setInviteBusyId(null);

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not send invite.");
      return;
    }

    setSuccess("Invite sent. The user will see it in Inbox.");
    await refreshUsers();
  }

  if (status === "loading" || loading) {
    return <div className="mx-auto max-w-3xl text-slate-400">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Find teammates</h1>
      <p className="mt-2 text-sm text-slate-400">
        Browse users, check skills and availability, then send an invite straight to your project.
      </p>
      <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Project</span>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              {projects.length === 0 ? (
                <option value="">No recruiting projects</option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Role to invite for</span>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              {openRoles.length === 0 ? (
                <option value="">No open roles</option>
              ) : (
                openRoles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} ({r.openings - r.filledCount} open)
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs text-slate-500">Optional note to include in invitation</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Your profile matches our frontend role."
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, skill, availability..."
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={refreshUsers}
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:border-slate-500"
          >
            Search
          </button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Minimum match score</span>
            <select
              value={minMatch}
              onChange={(e) => setMinMatch(Number(e.target.value))}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              <option value={0}>Any</option>
              <option value={40}>40%+</option>
              <option value={60}>60%+</option>
              <option value={80}>80%+</option>
            </select>
          </label>
          <label className="mt-6 flex items-center gap-2 text-sm text-slate-300 sm:mt-0">
            <input
              type="checkbox"
              checked={onlyWithAvailability}
              onChange={(e) => setOnlyWithAvailability(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900"
            />
            Only users with availability filled
          </label>
        </div>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500"
          >
            Reset filters
          </button>
        </div>
        {roleRequirements.length > 0 && (
          <p className="mt-3 text-xs text-slate-400">
            Match score is based on role requirements: {roleRequirements.join(", ")}.
          </p>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-700/50 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-lg border border-emerald-700/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
          {success}
        </div>
      )}

      {visibleUsers.length === 0 ? (
        <p className="mt-8 text-slate-500">No matching users found right now.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {visibleUsers.map((u) => (
            <div
              key={u.id}
              className="rounded-lg border border-slate-800 bg-slate-900/40 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {u.avatarUrl ? (
                      <img
                        src={u.avatarUrl}
                        alt="Avatar"
                        className="h-8 w-8 rounded-full border border-slate-700 object-cover"
                      />
                    ) : (
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-xs text-slate-300">
                        {(u.name?.[0] ?? "U").toUpperCase()}
                      </span>
                    )}
                    <Link href={`/profile/${u.id}`} className="font-medium text-brand hover:underline">
                      {u.name ?? "User"}
                    </Link>
                  </div>
                  {u.email && <p className="mt-1 text-xs text-slate-500">{u.email}</p>}
                  {u.availability && (
                    <p className="mt-1 text-xs text-slate-400">Availability: {u.availability}</p>
                  )}
                  {u.matchScore != null && (
                    <p className="mt-1 text-xs text-emerald-300">
                      Match: {u.matchScore}%{" "}
                      {u.matchedSkills.length > 0
                        ? `(${u.matchedSkills.join(", ")})`
                        : "(no required skills matched yet)"}
                    </p>
                  )}
                  {u.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {u.skills.slice(0, 8).map((s) => (
                        <span key={s} className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={inviteBusyId === u.id || !projectId || !roleId}
                  onClick={() => sendInvite(u.id)}
                  className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50"
                >
                  {inviteBusyId === u.id ? "Sending..." : "Invite"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

