"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

type Report = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  status: string;
  createdAt: string;
  reporter: { id: string; name: string | null; email: string };
};

export default function AdminReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/admin/reports");
      return;
    }
    if (status !== "authenticated") return;

    fetch("/api/admin/reports")
      .then((r) => {
        if (r.status === 403) {
          setAccessDenied(true);
          return [];
        }
        return r.ok ? r.json() : [];
      })
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, [status, router]);

  async function updateStatus(reportId: string, newStatus: string) {
    setActing(reportId);
    const res = await fetch(`/api/admin/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    }
    setActing(null);
  }

  if (status === "loading" || loading) {
    return <div className="mx-auto max-w-2xl text-slate-400">Loading…</div>;
  }

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-red-400">Access denied. Moderator access required.</p>
        <Link href="/" className="mt-4 block text-brand hover:underline">← Back</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold">Moderation Queue</h1>
      <Link href="/" className="mb-6 block text-sm text-brand hover:underline">← Back</Link>

      {reports.length === 0 ? (
        <p className="text-slate-500">No pending reports</p>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-slate-700 bg-slate-900/50 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {r.targetType} #{r.targetId.slice(0, 8)}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(r.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-slate-300 mb-2">
                Reporter: {r.reporter.name ?? r.reporter.email}
              </p>
              {r.reason && (
                <p className="text-sm text-slate-400 mb-3">{r.reason}</p>
              )}
              <div className="flex gap-2">
                <Link
                  href={r.targetType === "Project" ? `/projects/${r.targetId}` : `/profile/${r.targetId}`}
                  className="text-sm text-brand hover:underline"
                >
                  View {r.targetType}
                </Link>
                <button
                  onClick={() => updateStatus(r.id, "Reviewed")}
                  disabled={!!acting}
                  className="rounded border border-slate-600 px-2 py-1 text-xs text-slate-400 hover:bg-slate-700 disabled:opacity-50"
                >
                  Mark Reviewed
                </button>
                <button
                  onClick={() => updateStatus(r.id, "Resolved")}
                  disabled={!!acting}
                  className="rounded border border-green-600 px-2 py-1 text-xs text-green-400 hover:bg-green-500/10 disabled:opacity-50"
                >
                  Resolve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
