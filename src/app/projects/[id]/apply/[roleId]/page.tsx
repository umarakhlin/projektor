"use client";

import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

type Role = {
  id: string;
  title: string;
  requirements: string | null;
  openings: number;
  filledCount: number;
};

type Project = {
  id: string;
  title: string;
  owner: { name: string | null };
  hoursPerWeek: number | null;
  durationMonths: number | null;
};

export default function ApplyPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const projectId = params.id as string;
  const roleId = params.roleId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [message, setMessage] = useState("");
  const [links, setLinks] = useState([{ url: "", label: "" }]);
  const [availability, setAvailability] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/auth/signin?callbackUrl=/projects/${projectId}/apply/${roleId}`);
      return;
    }
    if (status !== "authenticated") return;

    fetch(`/api/projects/${projectId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((p) => {
        setProject(p);
        const r = p.roles?.find((x: Role) => x.id === roleId);
        setRole(r ?? null);
      })
      .catch(() => setError("Project or role not found"))
      .finally(() => setLoading(false));
  }, [projectId, roleId, status, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const validLinks = links
      .filter((l) => l.url.trim())
      .map((l) => ({ url: l.url.trim(), label: l.label?.trim() || undefined }));

    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roleId,
        message: message.trim() || undefined,
        links: validLinks.length ? validLinks : undefined,
        availability: availability.trim() || undefined
      })
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to apply");
      return;
    }

    setSuccess(true);
    router.refresh();
  }

  function addLink() {
    setLinks((prev) => [...prev, { url: "", label: "" }]);
  }

  function updateLink(i: number, field: "url" | "label", value: string) {
    setLinks((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  function removeLink(i: number) {
    setLinks((prev) => prev.filter((_, idx) => idx !== i));
  }

  if (status === "loading" || loading) {
    return <div className="mx-auto max-w-lg text-slate-400">Loading…</div>;
  }

  if (!project || !role) {
    return (
      <div className="mx-auto max-w-lg">
        <p className="text-red-400">{error || "Not found"}</p>
        <Link href={`/projects/${projectId}`} className="mt-4 block text-brand hover:underline">
          Back to project
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <h1 className="mb-4 text-xl font-semibold text-green-400">Application sent</h1>
        <p className="text-slate-400">
          The creator will review your application. You&apos;ll see any offers in your Inbox.
        </p>
        <Link
          href="/inbox"
          className="mt-6 inline-block text-brand hover:underline"
        >
          Go to Inbox
        </Link>
        <span className="mx-2 text-slate-500">·</span>
        <Link href={`/projects/${projectId}`} className="text-brand hover:underline">
          Back to project
        </Link>
      </div>
    );
  }

  const requirements = role.requirements
    ? (JSON.parse(role.requirements) as string[])
    : [];

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-2 text-xl font-semibold">Apply for {role.title}</h1>
      <p className="mb-6 text-sm text-slate-400">
        {project.title} · {project.owner.name ?? "Unknown"}
        {project.hoursPerWeek && project.durationMonths &&
          ` · ${project.hoursPerWeek}h/wk · ${project.durationMonths}mo`}
      </p>

      {requirements.length > 0 && (
        <p className="mb-4 text-sm text-slate-400">
          Skills: {requirements.join(", ")}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-400">Message *</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={4}
            placeholder="Introduce yourself and why you're a fit..."
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>

        <div>
          <span className="block text-sm text-slate-400 mb-2">Links (portfolio, GitHub)</span>
          {links.map((link, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <input
                type="url"
                value={link.url}
                onChange={(e) => updateLink(i, "url", e.target.value)}
                placeholder="https://..."
                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <input
                type="text"
                value={link.label}
                onChange={(e) => updateLink(i, "label", e.target.value)}
                placeholder="Label"
                className="w-24 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <button type="button" onClick={() => removeLink(i)} className="text-slate-400 hover:text-red-400">
                ×
              </button>
            </div>
          ))}
          <button type="button" onClick={addLink} className="text-sm text-brand hover:underline">
            + Add link
          </button>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-400">Availability</span>
          <input
            type="text"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            placeholder="e.g. 10 hrs/week, evenings"
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-light disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send application"}
          </button>
          <Link
            href={`/projects/${projectId}`}
            className="rounded-lg border border-slate-600 px-4 py-2 text-slate-400 hover:text-slate-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
