"use client";

import { useState } from "react";

type Props = {
  projectId: string;
  status: string;
  memberCount: number;
  isOwner: boolean;
};

export function ProjectStatusControls({
  projectId,
  status,
  memberCount,
  isOwner
}: Props) {
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status);

  async function setStatus(newStatus: string) {
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      setCurrentStatus(newStatus);
      window.location.reload();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Failed to update status");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {isOwner && projectId && currentStatus !== "Draft" && (
        <>
          {currentStatus === "Recruiting" && memberCount >= 1 && (
            <button
              onClick={() => setStatus("Active")}
              disabled={loading}
              className="rounded border border-green-600 px-3 py-1 text-sm text-green-400 hover:bg-green-500/10 disabled:opacity-50"
            >
              Set Active
            </button>
          )}
          {currentStatus === "Active" && (
            <button
              onClick={() => setStatus("Closed")}
              disabled={loading}
              className="rounded border border-slate-600 px-3 py-1 text-sm text-slate-400 hover:bg-slate-500/10 disabled:opacity-50"
            >
              Close project
            </button>
          )}
          {currentStatus === "Closed" && (
            <button
              onClick={() => setStatus("Recruiting")}
              disabled={loading}
              className="rounded border border-brand px-3 py-1 text-sm text-brand hover:bg-brand/10 disabled:opacity-50"
            >
              Reopen
            </button>
          )}
        </>
      )}
    </div>
  );
}
