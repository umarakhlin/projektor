"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { BionicText } from "@/components/bionic-text";

type Role = {
  id: string;
  title: string;
  openings: number;
  filledCount: number;
  state: string;
  requirements?: string | null;
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
};

type InviteForm = {
  projectId: string;
  roleId: string;
  note: string;
};

function parseRequirements(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((s): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function PeopleTab() {
  const { status } = useSession();
  const [projects, setProjects] = useState<OwnerProject[]>([]);
  const [users, setUsers] = useState<TalentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [onlyWithAvailability, setOnlyWithAvailability] = useState(false);
  const [skillFilter, setSkillFilter] = useState("");
  const [matchRoleId, setMatchRoleId] = useState("");
  const [minMatch, setMinMatch] = useState<number>(0);
  const [error, setError] = useState("");
  const [globalSuccess, setGlobalSuccess] = useState("");

  const [openInviteUserId, setOpenInviteUserId] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState<InviteForm>({
    projectId: "",
    roleId: "",
    note: ""
  });
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [recentlyInvited, setRecentlyInvited] = useState<Set<string>>(new Set());

  const inviteProjects = useMemo(
    () =>
      projects.filter((p) => p.status === "Recruiting" || p.status === "Active"),
    [projects]
  );

  const selectedProjectForInvite = useMemo(
    () => inviteProjects.find((p) => p.id === inviteForm.projectId) ?? null,
    [inviteProjects, inviteForm.projectId]
  );

  const openRoles = useMemo(() => {
    if (!selectedProjectForInvite) return [];
    return selectedProjectForInvite.roles.filter(
      (r) => r.state !== "Filled" && r.openings - r.filledCount > 0
    );
  }, [selectedProjectForInvite]);

  const allMatchableRoles = useMemo(() => {
    return inviteProjects.flatMap((p) =>
      p.roles
        .filter((r) => r.state !== "Filled" && r.openings - r.filledCount > 0)
        .map((r) => ({ ...r, projectTitle: p.title }))
    );
  }, [inviteProjects]);

  const selectedMatchRole = useMemo(
    () => allMatchableRoles.find((r) => r.id === matchRoleId) ?? null,
    [allMatchableRoles, matchRoleId]
  );

  const matchRequirements = useMemo(
    () =>
      selectedMatchRole
        ? parseRequirements(selectedMatchRole.requirements).map((s) =>
            s.toLowerCase()
          )
        : [],
    [selectedMatchRole]
  );

  async function loadUsers(q: string) {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/talent?${params.toString()}`);
    if (!res.ok) throw new Error("Could not load users right now.");
    const data = await res.json();
    setUsers(Array.isArray(data.users) ? data.users : []);
  }

  useEffect(() => {
    if (status !== "authenticated") return;

    async function loadInit() {
      setLoading(true);
      setError("");
      try {
        const projectsRes = await fetch("/api/projects");
        if (projectsRes.ok) {
          const all = (await projectsRes.json()) as OwnerProject[];
          setProjects(Array.isArray(all) ? all : []);
        }
        await loadUsers("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load talent.");
      } finally {
        setLoading(false);
      }
    }
    void loadInit();
  }, [status]);

  const allSkillOptions = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => u.skills.forEach((s) => set.add(s)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const enrichedUsers = useMemo(() => {
    return users.map((u) => {
      const lowerSkills = u.skills.map((s) => s.toLowerCase());
      const matched = matchRequirements.filter((req) =>
        lowerSkills.includes(req)
      );
      const matchScore = matchRequirements.length
        ? Math.round((matched.length / matchRequirements.length) * 100)
        : null;
      return { ...u, matchScore, matchedSkills: matched };
    });
  }, [users, matchRequirements]);

  const visibleUsers = useMemo(() => {
    return enrichedUsers
      .filter((u) =>
        onlyWithAvailability ? Boolean(u.availability?.trim()) : true
      )
      .filter((u) =>
        skillFilter
          ? u.skills.map((s) => s.toLowerCase()).includes(skillFilter.toLowerCase())
          : true
      )
      .filter((u) => {
        if (minMatch <= 0) return true;
        if (u.matchScore == null) return false;
        return u.matchScore >= minMatch;
      })
      .sort((a, b) => {
        const scoreA = a.matchScore ?? -1;
        const scoreB = b.matchScore ?? -1;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return (a.name ?? "").localeCompare(b.name ?? "");
      });
  }, [enrichedUsers, onlyWithAvailability, skillFilter, minMatch]);

  async function refreshUsers() {
    setError("");
    try {
      await loadUsers(query);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh users.");
    }
  }

  function resetFilters() {
    setQuery("");
    setSkillFilter("");
    setMatchRoleId("");
    setMinMatch(0);
    setOnlyWithAvailability(false);
    setError("");
  }

  function openInviteFor(userId: string) {
    const firstProject = inviteProjects[0];
    const firstRole = firstProject?.roles?.find(
      (r) => r.state !== "Filled" && r.openings - r.filledCount > 0
    );
    const defaultProjectId = selectedMatchRole
      ? inviteProjects.find((p) =>
          p.roles.some((r) => r.id === selectedMatchRole.id)
        )?.id ?? firstProject?.id ?? ""
      : firstProject?.id ?? "";
    const defaultRoleId = selectedMatchRole?.id ?? firstRole?.id ?? "";
    setInviteForm({
      projectId: defaultProjectId,
      roleId: defaultRoleId,
      note: ""
    });
    setInviteError("");
    setGlobalSuccess("");
    setOpenInviteUserId(userId);
  }

  function closeInvite() {
    setOpenInviteUserId(null);
    setInviteError("");
  }

  async function submitInvite(userId: string) {
    if (!inviteForm.projectId || !inviteForm.roleId) {
      setInviteError("Choose a project and an open role first.");
      return;
    }
    setInviteBusy(true);
    setInviteError("");
    const res = await fetch(`/api/projects/${inviteForm.projectId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        roleId: inviteForm.roleId,
        note: inviteForm.note.trim() || undefined
      })
    });
    setInviteBusy(false);

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setInviteError(data.error ?? "Could not send invite.");
      return;
    }
    setRecentlyInvited((prev) => {
      const next = new Set(prev);
      next.add(userId);
      return next;
    });
    setOpenInviteUserId(null);
    setGlobalSuccess("Invite sent. The user will see it in Inbox.");
  }

  if (status === "loading") {
    return <p className="text-slate-400">Loading…</p>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-6 py-10 text-center">
        <p className="text-slate-200">Sign in to discover teammates.</p>
        <p className="mt-2 text-sm text-slate-500">
          You can browse all users on Projektor, see their skills and availability,
          and invite them to your projects.
        </p>
        <Link
          href="/auth/signin?callbackUrl=/explore?tab=people"
          className="mt-5 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (loading) {
    return <p className="text-slate-400">Loading…</p>;
  }

  return (
    <div>
      <p className="mb-4 text-sm text-slate-400">
        Browse all users on Projektor. Use filters to narrow down, then invite
        anyone to any of your projects.
      </p>

      <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex gap-2">
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

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Filter by skill</span>
            <select
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Any skill</option>
              {allSkillOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Match for role</span>
            <select
              value={matchRoleId}
              onChange={(e) => setMatchRoleId(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">No role comparison</option>
              {allMatchableRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.projectTitle} · {r.title}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">Minimum match score</span>
            <select
              value={minMatch}
              onChange={(e) => setMinMatch(Number(e.target.value))}
              disabled={!selectedMatchRole}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 disabled:opacity-50"
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

        {selectedMatchRole && matchRequirements.length > 0 && (
          <p className="mt-3 text-xs text-slate-400">
            Match score for <strong>{selectedMatchRole.title}</strong> based on:{" "}
            {matchRequirements.join(", ")}.
          </p>
        )}
        {selectedMatchRole && matchRequirements.length === 0 && (
          <p className="mt-3 text-xs text-slate-400">
            This role has no required skills listed, so match score is not
            calculated.
          </p>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-700/50 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
      {globalSuccess && (
        <div className="mt-4 rounded-lg border border-emerald-700/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
          {globalSuccess}
        </div>
      )}

      {visibleUsers.length === 0 ? (
        <p className="mt-8 text-slate-500">No matching users found right now.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {visibleUsers.map((u) => {
            const isInviteOpen = openInviteUserId === u.id;
            const wasInvited = recentlyInvited.has(u.id);
            return (
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
                      <Link
                        href={`/profile/${u.id}`}
                        className="font-medium text-brand hover:underline"
                      >
                        <BionicText as="span" text={u.name ?? "User"} />
                      </Link>
                    </div>
                    {u.email && (
                      <p className="mt-1 text-xs text-slate-500">{u.email}</p>
                    )}
                    {u.availability && (
                      <p className="mt-1 text-xs text-slate-400">
                        Availability: {u.availability}
                      </p>
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
                          <span
                            key={s}
                            className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {wasInvited ? (
                      <span className="rounded-lg border border-emerald-700/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                        Invite sent
                      </span>
                    ) : isInviteOpen ? (
                      <button
                        type="button"
                        onClick={closeInvite}
                        className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500"
                      >
                        Cancel
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openInviteFor(u.id)}
                        className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-light"
                      >
                        Invite to project
                      </button>
                    )}
                    <Link
                      href={`/messages/${u.id}`}
                      className="rounded-lg border border-slate-600 px-3 py-2 text-center text-sm text-slate-200 hover:border-slate-500"
                    >
                      Send message
                    </Link>
                  </div>
                </div>

                {isInviteOpen && (
                  <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                    {inviteProjects.length === 0 ? (
                      <div className="text-sm text-slate-300">
                        You don&apos;t have a Recruiting or Active project yet.{" "}
                        <Link
                          href="/my-projects"
                          className="text-brand hover:underline"
                        >
                          Go to My Projects
                        </Link>{" "}
                        to publish one first.
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex flex-col gap-1">
                          <span className="text-xs text-slate-500">Project</span>
                          <select
                            value={inviteForm.projectId}
                            onChange={(e) => {
                              const nextProjectId = e.target.value;
                              const nextProject = inviteProjects.find(
                                (p) => p.id === nextProjectId
                              );
                              const firstOpen = nextProject?.roles?.find(
                                (r) =>
                                  r.state !== "Filled" &&
                                  r.openings - r.filledCount > 0
                              );
                              setInviteForm((prev) => ({
                                ...prev,
                                projectId: nextProjectId,
                                roleId: firstOpen?.id ?? ""
                              }));
                            }}
                            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                          >
                            {inviteProjects.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.title}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs text-slate-500">Role</span>
                          <select
                            value={inviteForm.roleId}
                            onChange={(e) =>
                              setInviteForm((prev) => ({
                                ...prev,
                                roleId: e.target.value
                              }))
                            }
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
                          <span className="text-xs text-slate-500">
                            Optional note
                          </span>
                          <input
                            type="text"
                            value={inviteForm.note}
                            onChange={(e) =>
                              setInviteForm((prev) => ({
                                ...prev,
                                note: e.target.value
                              }))
                            }
                            placeholder="e.g. Your profile looks like a great fit for this role."
                            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                          />
                        </label>
                      </div>
                    )}

                    {inviteError && (
                      <div className="mt-3 rounded-lg border border-red-700/50 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                        {inviteError}
                      </div>
                    )}

                    {inviteProjects.length > 0 && (
                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={closeInvite}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:border-slate-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={
                            inviteBusy ||
                            !inviteForm.projectId ||
                            !inviteForm.roleId
                          }
                          onClick={() => submitInvite(u.id)}
                          className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50"
                        >
                          {inviteBusy ? "Sending..." : "Send invite"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
