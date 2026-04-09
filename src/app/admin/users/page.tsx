"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  emailVerifiedAt: string | null;
  emailVerificationReminderPending: boolean;
  _count: {
    projectsOwned: number;
    applications: number;
  };
};

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/admin/users");
      return;
    }
    if (status !== "authenticated") return;

    fetch("/api/admin/users")
      .then((r) => {
        if (r.status === 403) {
          setAccessDenied(true);
          return [];
        }
        return r.ok ? r.json() : [];
      })
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [status, router]);

  const visibleUsers = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const haystack = `${u.email} ${u.name ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [users, filter]);

  async function saveUser(user: AdminUser, next: { name: string; emailVerified: boolean }) {
    setSavingUserId(user.id);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next)
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? {
                ...u,
                name: updated.name,
                emailVerifiedAt: updated.emailVerifiedAt,
                emailVerificationReminderPending:
                  updated.emailVerificationReminderPending
              }
            : u
        )
      );
    }
    setSavingUserId(null);
  }

  async function remindUserToVerify(user: AdminUser) {
    setSavingUserId(user.id);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remindToVerifyEmail: true })
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? {
                ...u,
                emailVerificationReminderPending:
                  updated.emailVerificationReminderPending
              }
            : u
        )
      );
    }
    setSavingUserId(null);
  }

  async function deleteUser(user: AdminUser) {
    if (!window.confirm(`Delete user ${user.email}? This cannot be undone.`)) return;
    setSavingUserId(user.id);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "DELETE"
    });
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Failed to delete user");
    }
    setSavingUserId(null);
  }

  if (status === "loading" || loading) {
    return <div className="mx-auto max-w-4xl text-slate-400">Loading…</div>;
  }

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-red-400">Access denied. Moderator access required.</p>
        <Link href="/" className="mt-4 block text-brand hover:underline">
          ← Back
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Admin Users</h1>
        <Link href="/admin/reports" className="text-sm text-brand hover:underline">
          Go to moderation queue
        </Link>
      </div>
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search by name or email"
        className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />

      <div className="space-y-3">
        {visibleUsers.map((user) => (
          <UserRow
            key={user.id}
            user={user}
            saving={savingUserId === user.id}
            onSave={saveUser}
            onDelete={deleteUser}
            onRemind={remindUserToVerify}
            canDelete={session?.user?.id !== user.id}
          />
        ))}
      </div>
    </div>
  );
}

function UserRow({
  user,
  saving,
  onSave,
  onDelete,
  onRemind,
  canDelete
}: {
  user: AdminUser;
  saving: boolean;
  onSave: (user: AdminUser, next: { name: string; emailVerified: boolean }) => Promise<void>;
  onDelete: (user: AdminUser) => Promise<void>;
  onRemind: (user: AdminUser) => Promise<void>;
  canDelete: boolean;
}) {
  const [name, setName] = useState(user.name ?? "");
  const [emailVerified, setEmailVerified] = useState(Boolean(user.emailVerifiedAt));

  useEffect(() => {
    setName(user.name ?? "");
    setEmailVerified(Boolean(user.emailVerifiedAt));
  }, [user.id, user.name, user.emailVerifiedAt]);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{user.email}</p>
          <p className="text-xs text-slate-500">
            Joined {new Date(user.createdAt).toLocaleString()} · {user._count.projectsOwned} projects · {user._count.applications} applications
          </p>
          {user.emailVerificationReminderPending && (
            <p className="mt-1 text-xs text-amber-300">
              Reminder is queued for next login.
            </p>
          )}
        </div>
        <Link href={`/profile/${user.id}`} className="text-xs text-brand hover:underline">
          View profile
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={emailVerified}
            onChange={(e) => setEmailVerified(e.target.checked)}
          />
          Email verified
        </label>
        <button
          disabled={saving}
          onClick={() => onSave(user, { name, emailVerified })}
          className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          disabled={saving || !canDelete}
          onClick={() => onDelete(user)}
          className="rounded-lg border border-red-700 px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-900/20 disabled:cursor-not-allowed disabled:opacity-50"
          title={canDelete ? "Delete this user account" : "You cannot delete your own account"}
        >
          Delete user
        </button>
        <button
          disabled={saving || !!user.emailVerifiedAt}
          onClick={() => onRemind(user)}
          className="rounded-lg border border-amber-700 px-3 py-2 text-sm font-medium text-amber-300 hover:bg-amber-900/20 disabled:cursor-not-allowed disabled:opacity-50"
          title={
            user.emailVerifiedAt
              ? "Email is already verified"
              : "Show verification reminder on next login"
          }
        >
          Remind next login
        </button>
      </div>
    </div>
  );
}
