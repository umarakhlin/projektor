"use client";

import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

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
  const [newChatMessage, setNewChatMessage] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push(`/auth/signin?callbackUrl=/projects/${projectId}/space`);
      return;
    }
    if (authStatus !== "authenticated") return;

    Promise.all([
      fetch(`/api/projects/${projectId}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/projects/${projectId}/updates`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/projects/${projectId}/tasks`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/projects/${projectId}/chat`).then((r) => (r.ok ? r.json() : []))
    ]).then(([proj, up, t, chat]) => {
      setProject(proj);
      setUpdates(Array.isArray(up) ? up : []);
      setTasks(Array.isArray(t) ? t : []);
      setChatMessages(Array.isArray(chat) ? chat : []);
    }).finally(() => setLoading(false));
  }, [authStatus, projectId, router]);

  // Poll chat so new messages appear without refresh
  useEffect(() => {
    if (!projectId || !session?.user?.id) return;
    const interval = setInterval(() => {
      fetch(`/api/projects/${projectId}/chat`)
        .then((r) => (r.ok ? r.json() : []))
        .then((list) => Array.isArray(list) && setChatMessages(list));
    }, 5000);
    return () => clearInterval(interval);
  }, [projectId, session?.user?.id]);

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
      body: JSON.stringify({ title: newTask.trim() })
    });
    if (res.ok) {
      const t = await res.json();
      setTasks((prev) => [t, ...prev]);
      setNewTask("");
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
    }
    setPosting(false);
  }

  async function updateTaskStatus(taskId: string, status: string) {
    const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
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
      <h1 className="mb-2 text-xl font-semibold">Team Space</h1>
      <p className="mb-6 text-sm text-slate-400">{project.title}</p>

      <Link
        href={`/projects/${projectId}`}
        className="mb-6 block text-sm text-brand hover:underline"
      >
        ← Back to project
      </Link>

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
                  <p className="text-sm text-slate-200">{msg.content}</p>
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
                <p className="text-slate-200">{u.content}</p>
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
          <form onSubmit={createTask} className="mb-4 flex gap-2">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add a task..."
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
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
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <p className="text-slate-500">No tasks yet</p>
          ) : (
            tasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 p-3"
              >
                <span
                  className={
                    t.status === "Done" ? "text-slate-500 line-through" : ""
                  }
                >
                  {t.title}
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={t.status}
                    onChange={(e) => updateTaskStatus(t.id, e.target.value)}
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-300"
                  >
                    <option value="Todo">To Do</option>
                    <option value="Doing">Doing</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              </div>
            ))
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
