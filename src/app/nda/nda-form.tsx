"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function NdaForm({ ndaVersion }: { ndaVersion: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    if (!confirmed) {
      setError("Please tick the confirmation to continue.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/me/accept-nda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ndaVersion })
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not record acceptance. Please try again.");
      return;
    }
    const safeNext = callbackUrl.startsWith("/") ? callbackUrl : "/";
    router.replace(safeNext);
    router.refresh();
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
      <label className="flex items-start gap-3 text-sm text-slate-200">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900"
        />
        <span>
          I have read and understand the rules above. I will treat all
          ideas, pitches, and project details I see on Projektor as
          confidential and will not copy, reuse, or share them outside of
          legitimate collaboration.
        </span>
      </label>

      {error && (
        <div className="mt-4 rounded-lg border border-red-700/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Version {ndaVersion}. Your acceptance is recorded with a timestamp
          for our records.
        </p>
        <button
          type="button"
          disabled={busy || !confirmed}
          onClick={() => void accept()}
          className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50"
        >
          {busy ? "Saving…" : "I agree, continue"}
        </button>
      </div>
    </div>
  );
}
