"use client";

import { useState } from "react";

type Props = {
  targetType: "Project" | "User";
  targetId: string;
  label?: string;
};

export function ReportButton({ targetType, targetId, label = "Report" }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim() || submitting) return;
    setSubmitting(true);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, reason: reason.trim() })
    });
    setSubmitting(false);
    if (res.ok) {
      setDone(true);
      setOpen(false);
      setReason("");
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Failed to submit report");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-sm text-slate-500 hover:text-red-400"
      >
        {label}
      </button>
      {open && (
        <form onSubmit={submit} className="mt-2 rounded border border-slate-700 bg-slate-900 p-4">
          <label className="block text-sm text-slate-400 mb-2">Reason (optional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe the issue..."
            rows={2}
            className="mb-3 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-red-500/20 px-3 py-1 text-sm text-red-400 hover:bg-red-500/30 disabled:opacity-50"
            >
              Submit report
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-slate-500 hover:text-slate-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {done && <span className="ml-2 text-xs text-slate-500">Report submitted</span>}
    </div>
  );
}
