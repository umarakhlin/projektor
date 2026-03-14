"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

type Profile = {
  id: string;
  email: string;
  name: string | null;
  skills: string[];
  links: { url: string; label?: string }[];
  availability: string | null;
  settings: { showEmail?: boolean };
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [links, setLinks] = useState<{ url: string; label?: string }[]>([]);
  const [availability, setAvailability] = useState("");
  const [showEmail, setShowEmail] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/profile");
      return;
    }
    if (status !== "authenticated") return;

    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: Profile) => {
        setProfile(data);
        setName(data.name ?? "");
        setSkillsText(data.skills?.join(", ") ?? "");
        setLinks(data.links?.length ? data.links : [{ url: "", label: "" }]);
        setAvailability(data.availability ?? "");
        setShowEmail(data.settings?.showEmail ?? true);
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [status, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setError("");
    setSaving(true);

    const skills = skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const validLinks = links
      .filter((l) => l.url.trim())
      .map((l) => ({ url: l.url.trim(), label: l.label?.trim() || undefined }));

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name || null,
        skills,
        links: validLinks,
        availability: availability || null,
        settings: { showEmail }
      })
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save");
      return;
    }

    const data = await res.json();
    setProfile(data);
    router.refresh();
  }

  function addLink() {
    setLinks((prev) => [...prev, { url: "", label: "" }]);
  }

  function removeLink(i: number) {
    setLinks((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateLink(i: number, field: "url" | "label", value: string) {
    setLinks((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  if (status === "loading" || loading) {
    return (
      <div className="mx-auto max-w-lg text-slate-400">
        Loading profile…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg">
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
        <Link href="/auth/signin" className="text-brand hover:underline">
          Sign in to view profile
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-semibold">Profile</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error && (
          <div className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-400">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-400">Skills (comma-separated)</span>
          <input
            type="text"
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
            placeholder="React, TypeScript, Design"
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>

        <div>
          <span className="block text-sm text-slate-400 mb-2">Links (portfolio, GitHub, etc.)</span>
          <div className="flex flex-col gap-2">
            {links.map((link, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => updateLink(i, "url", e.target.value)}
                  placeholder="https://..."
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <input
                  type="text"
                  value={link.label ?? ""}
                  onChange={(e) => updateLink(i, "label", e.target.value)}
                  placeholder="Label"
                  className="w-24 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <button
                  type="button"
                  onClick={() => removeLink(i)}
                  className="text-slate-400 hover:text-red-400"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addLink}
              className="self-start text-sm text-brand hover:underline"
            >
              + Add link
            </button>
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-400">Availability</span>
          <input
            type="text"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            placeholder="e.g. 10 hours/week, evenings"
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>

        <hr className="border-slate-700" />
        <h2 className="text-lg font-medium">Settings</h2>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showEmail}
            onChange={(e) => setShowEmail(e.target.checked)}
            className="rounded border-slate-600 bg-slate-900 text-brand focus:ring-brand"
          />
          <span className="text-sm text-slate-300">
            Show email on public profile (visible to creators when reviewing applications)
          </span>
        </label>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-light disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
