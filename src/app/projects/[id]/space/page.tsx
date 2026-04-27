"use client";

import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BionicText } from "@/components/bionic-text";

type Update = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string | null };
};

type Task = {
  id: string;
  title: string;
  status: string;
  dueAt?: string | null;
  creator: { id: string; name: string | null };
  assignee: { id: string; name: string | null } | null;
};

type Member = {
  id: string;
  user: { id: string; name: string | null };
  role: { title: string };
};

type ChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string | null };
};

type Project = {
  id: string;
  title: string;
  status: string;
  ownerId: string;
  owner: { id: string; name: string | null } | null;
  memberships: Member[];
};

export default function TeamSpacePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUpdate, setNewUpdate] = useState("");
  const [newTask, setNewTask] = useState("");
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState("");
  const [newTaskDueAt, setNewTaskDueAt] = useState("");
  const [newChatMessage, setNewChatMessage] = useState("");
  const [posting, setPosting] = useState(false);

  const assigneeOptions = useMemo(() => {
    if (!project) return [] as { id: string; name: string }[];
    const options: { id: string; name: string }[] = [];
    if (project.owner?.id) {
      options.push({
        id: project.owner.id,
        name: project.owner.name ?? "Project owner"
      });
    }
    project.memberships?.forEach((m) => {
      const id = m.user?.id;
      if (!id || options.some((opt) => opt.id === id)) return;
      options.push({ id, name: m.user.name ?? "Member" });
    });
    return options;
  }, [project]);

  function markTeamSpaceSeen() {
    if (!projectId || !session?.user?.id) return;
    fetch("/api/me/team-space-notifications/seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId })
    }).catch(() => {});
  }

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push(`/auth/signin?callbackUrl=/projects/${projectId}/space`);
      return;
    }
    if (authStatus !== "authenticated") return;

    let isMounted = true;
    const loadAll = async () => {
      const [proj, up, t, chat] = await Promise.all([
        fetch(`/api/projects/${projectId}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/projects/${projectId}/updates`).then((r) => (r.ok ? r.json() : [])),
        fetch(`/api/projects/${projectId}/tasks`).then((r) => (r.ok ? r.json() : [])),
        fetch(`/api/projects/${projectId}/chat`).then((r) => (r.ok ? r.json() : []))
      ]);
      if (!isMounted) return;
      setProject(proj);
      setUpdates(Array.isArray(up) ? up : []);
      setTasks(Array.isArray(t) ? t : []);
      setChatMessages(Array.isArray(chat) ? chat : []);
      markTeamSpaceSeen();
    };

    loadAll()
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // Keep all Team Space sections fresh without manual refresh.
    const interval = setInterval(() => {
      loadAll().catch(() => {});
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [authStatus, projectId, router, session?.user?.id]);

  async function postUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!newUpdate.trim() || posting) return;
    setPosting(true);
    const res = await fetch(`/api/projects/${projectId}/updates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newUpdate.trim() })
    });
    if (res.ok) {
      const u = await res.json();
      setUpdates((prev) => [u, ...prev]);
      setNewUpdate("");
    }
    setPosting(false);
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.trim() || posting) return;
    setPosting(true);
    const res = await fetch(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTask.trim(),
        assigneeId: newTaskAssigneeId || undefined,
        dueAt: newTaskDueAt || null
      })
    });
    if (res.ok) {
      const t = await res.json();
      setTasks((prev) => [t, ...prev]);
      setNewTask("");
      setNewTaskAssigneeId("");
      setNewTaskDueAt("");
    }
    setPosting(false);
  }

  async function sendChatMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newChatMessage.trim() || posting) return;
    setPosting(true);
    const res = await fetch(`/api/projects/${projectId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newChatMessage.trim() })
    });
    if (res.ok) {
      const msg = await res.json();
      setChatMessages((prev) => [...prev, msg]);
      setNewChatMessage("");
      markTeamSpaceSeen();
    }
    setPosting(false);
  }

  async function updateTask(
    taskId: string,
    patch: { status?: string; assigneeId?: string | null; dueAt?: string | null }
  ) {
    const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? updated : t))
      );
    }
  }

  if (authStatus === "loading" || loading) {
    return <div className="mx-auto max-w-2xl text-slate-400">Loading…</div>;
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-red-400">Project not found or access denied</p>
        <Link href="/" className="mt-4 block text-brand hover:underline">← Back</Link>
      </div>
    );
  }

  const isOwner = session?.user?.id === project.ownerId;
  const isMember = project.memberships?.some((m) => m.user.id === session?.user?.id) || isOwner;
  if (!isMember) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-red-400">Only project members can view the Team Space</p>
        <Link href={`/projects/${projectId}`} className="mt-4 block text-brand hover:underline">← Back to project</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold">{project.title}</h1>
      <p className="mb-6 text-sm font-medium uppercase tracking-wide text-slate-500">
        Team Space
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link
          href={`/projects/${projectId}`}
          className="rounded-md border border-brand/40 bg-brand/10 px-3 py-1.5 text-sm text-brand hover:bg-brand/20"
        >
          See project →
        </Link>
        <Link
          href="/team-space"
          className="rounded-md border border-brand/40 bg-brand/10 px-3 py-1.5 text-sm text-brand hover:bg-brand/20"
        >
          Team Space feed →
        </Link>
      </div>

      {/* Team Chat */}
      <section className="mb-8">
        <h2 className="mb-3 font-medium">Team chat</h2>
        <div className="rounded-lg border border-slate-700 bg-slate-900/50">
          <div className="max-h-64 overflow-y-auto p-3 space-y-2">
            {chatMessages.length === 0 ? (
              <p className="text-sm text-slate-500">No messages yet. Say hi to your team.</p>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className="flex flex-col gap-0.5">
                  <span className="text-xs text-slate-400">
                    {msg.author.name ?? "Someone"} · {new Date(msg.createdAt).toLocaleString()}
                  </span>
                  <BionicText
                    as="p"
                    className="text-sm text-slate-200"
                    dir="auto"
                    text={msg.content}
                  />
                </div>
              ))
            )}
          </div>
          {isMember && (
            <form onSubmit={sendChatMessage} className="border-t border-slate-700 p-3">
              <div className="flex gap-2">
                <input
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <button
                  type="submit"
                  disabled={posting || !newChatMessage.trim()}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Updates */}
      <section className="mb-8">
        <h2 className="mb-3 font-medium">Updates</h2>
        {isMember && (
          <form onSubmit={postUpdate} className="mb-4">
            <textarea
              value={newUpdate}
              onChange={(e) => setNewUpdate(e.target.value)}
              placeholder="Post an update or announcement..."
              rows={3}
              className="mb-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <button
              type="submit"
              disabled={posting || !newUpdate.trim()}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50"
            >
              Post
            </button>
          </form>
        )}
        <div className="space-y-3">
          {updates.length === 0 ? (
            <p className="text-slate-500">No updates yet</p>
          ) : (
            updates.map((u) => (
              <div
                key={u.id}
                className="rounded-lg border border-slate-700 bg-slate-900/50 p-4"
              >
                <BionicText
                  as="p"
                  className="text-slate-200"
                  dir="auto"
                  text={u.content}
                />
                <p className="mt-2 text-xs text-slate-500">
                  {u.author.name ?? "Unknown"} · {new Date(u.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Tasks */}
      <section className="mb-8">
        <h2 className="mb-3 font-medium">Tasks</h2>
        {isMember && (
          <form onSubmit={createTask} className="mb-4 flex flex-wrap gap-2">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add a task..."
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
            <select
              value={newTaskAssigneeId}
              onChange={(e) => setNewTaskAssigneeId(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200"
            >
              <option value="">Assign to...</option>
              {assigneeOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={newTaskDueAt}
              onChange={(e) => setNewTaskDueAt(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200"
            />
            <button
              type="submit"
              disabled={posting || !newTask.trim()}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50"
            >
              Add
            </button>
          </form>
        )}
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <p className="text-slate-500">No tasks yet</p>
          ) : (
            <>
              {(["Todo", "Doing", "Done"] as const).map((status) => {
                const statusTasks = tasks.filter((t) => t.status === status);
                const labels = { Todo: "To do", Doing: "Started / Doing", Done: "Done" };
                const styles = {
                  Todo: "border-l-4 border-l-slate-500 bg-slate-900/50",
                  Doing: "border-l-4 border-l-amber-500 bg-amber-500/5",
                  Done: "border-l-4 border-l-green-600/70 bg-slate-900/30"
                };
                return (
                  <div key={status}>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      {labels[status]} ({statusTasks.length})
                    </p>
                    {statusTasks.length === 0 ? (
                      <p className="text-xs text-slate-500">No tasks in this section.</p>
                    ) : (
                      <div className="space-y-2">
                        {statusTasks.map((t) => (
                          <div
                            key={t.id}
                            className={`flex items-center justify-between rounded-lg border border-slate-700 p-3 ${styles[status]}`}
                          >
                            <div>
                              <span
                                className={
                                  t.status === "Done"
                                    ? "text-slate-500 line-through"
                                    : ""
                                }
                              >
                                {t.title}
                              </span>
                              <p className="mt-1 text-xs text-slate-500">
                                Created by {t.creator?.name ?? "Unknown"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Assigned to {t.assignee?.name ?? "Unassigned"}
                                {t.dueAt ? ` · Due ${new Date(t.dueAt).toLocaleDateString()}` : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={t.status}
                                onChange={(e) =>
                                  updateTask(t.id, { status: e.target.value })
                                }
                                className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-300"
                              >
                                <option value="Todo">To do</option>
                                <option value="Doing">Doing</option>
                                <option value="Done">Done</option>
                              </select>
                              <select
                                value={t.assignee?.id ?? ""}
                                onChange={(e) =>
                                  updateTask(t.id, { assigneeId: e.target.value || null })
                                }
                                className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-300"
                              >
                                <option value="">Unassigned</option>
                                {assigneeOptions.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="date"
                                value={t.dueAt ? new Date(t.dueAt).toISOString().slice(0, 10) : ""}
                                onChange={(e) =>
                                  updateTask(t.id, { dueAt: e.target.value || null })
                                }
                                className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-300"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </section>

      {/* Members */}
      <section>
        <h2 className="mb-3 font-medium">Team</h2>
        <div className="space-y-1">
          {project.memberships?.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <Link
                href={`/profile/${m.user.id}`}
                className="text-brand hover:underline"
              >
                {m.user.name ?? "Member"}
              </Link>
              <span className="text-slate-500">— {m.role.title}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
