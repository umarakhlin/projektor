"use client";

import { useCallback, useState } from "react";

type Props = {
  projectId: string;
  saved: boolean;
  onChange: (saved: boolean) => void;
  className?: string;
};

/** Heart / save project — must render above card links (later in DOM + z-index). */
export function SaveProjectHeart({ projectId, saved, onChange, className = "" }: Props) {
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    if (loading) return;
    const next = !saved;
    setLoading(true);
    try {
      const res = await fetch(`/api/me/saved-projects/${encodeURIComponent(projectId)}`, {
        method: next ? "POST" : "DELETE",
        credentials: "include"
      });
      if (res.ok) {
        onChange(next);
      }
    } catch {
      /* network error — keep previous state */
    } finally {
      setLoading(false);
    }
  }, [loading, projectId, saved, onChange]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle();
      }}
      disabled={loading}
      aria-label={saved ? "Remove from saved" : "Save project"}
      aria-pressed={saved}
      title={saved ? "Saved — click to remove" : "Save project"}
      className={`relative z-20 rounded-md p-1.5 leading-none transition hover:bg-slate-800/90 disabled:opacity-60 ${className}`}
    >
      {saved ? (
        <span
          className="text-2xl text-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]"
          aria-hidden="true"
        >
          ♥
        </span>
      ) : (
        <span className="text-2xl text-slate-500 hover:text-slate-300" aria-hidden="true">
          ♡
        </span>
      )}
    </button>
  );
}
