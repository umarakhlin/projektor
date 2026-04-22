"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { isProfileComplete } from "@/lib/profile-completion";

type Profile = {
  id: string;
  email: string;
  name: string | null;
  skills: string[];
  links: { url: string; label?: string }[];
  availability: string | null;
  settings: {
    showEmail?: boolean;
    avatarUrl?: string;
    dmEmailNotifications?: boolean;
  };
};

const SKILL_OPTIONS = [
  "Frontend",
  "Backend",
  "Fullstack",
  "UI/UX Design",
  "Product Management",
  "Marketing",
  "Sales",
  "Data Analysis",
  "AI/ML",
  "DevOps",
  "QA Testing",
  "Mobile"
] as const;

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [links, setLinks] = useState<{ url: string; label?: string }[]>([]);
  const [availability, setAvailability] = useState("");
  const [showEmail, setShowEmail] = useState(true);
  const [dmEmailNotifications, setDmEmailNotifications] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [savedHint, setSavedHint] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const initializedRef = useRef(false);

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
        setSkills(Array.isArray(data.skills) ? data.skills : []);
        setLinks(data.links?.length ? data.links : []);
        setAvailability(data.availability ?? "");
        setShowEmail(data.settings?.showEmail ?? true);
        setDmEmailNotifications(data.settings?.dmEmailNotifications ?? true);
        setAvatarUrl(data.settings?.avatarUrl ?? "");
        initializedRef.current = true;
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, [status, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setError("");
    setSaving(true);

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
        settings: {
          showEmail,
          dmEmailNotifications,
          avatarUrl: avatarUrl.trim() || undefined
        }
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

  function addPhotoLink() {
    setLinks((prev) => [...prev, { url: "", label: "Photo" }]);
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

  function toggleSkill(skill: string) {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image is too large. Please use up to 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setError("");
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    if (!initializedRef.current || !profile) return;
    const timeout = setTimeout(async () => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || null,
          settings: { avatarUrl: avatarUrl.trim() || undefined }
        })
      });
      if (res.ok) {
        setSavedHint("Saved");
        setTimeout(() => setSavedHint(""), 1200);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [name, avatarUrl, profile]);

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

  const profileCheck = {
    name: name.trim() || profile.name,
    skills,
    settings: { avatarUrl: avatarUrl.trim() || undefined }
  };
  const looksComplete = isProfileComplete(profileCheck);

  return (
    <div className="mx-auto max-w-lg">
      <p className="mb-4 text-sm leading-relaxed text-slate-400">
        This is what teammates and project owners see when they work with you. A clear name, photo,
        and skills help when you apply and when people browse your public page.
      </p>
      {!looksComplete && (
        <div className="mb-6 rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-slate-200">
          <p className="font-medium text-brand">Profile checklist</p>
          <p className="mt-1 text-slate-300">
            Add a <strong className="font-medium text-slate-200">display name</strong>, a{" "}
            <strong className="font-medium text-slate-200">profile picture</strong>, and at least one{" "}
            <strong className="font-medium text-slate-200">skill</strong> to unlock the full quick-start
            experience on your home feed.
          </p>
        </div>
      )}
      <div className="mb-6 flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarFileChange}
          className="hidden"
        />
        {avatarUrl.trim() ? (
          <img
            src={avatarUrl}
            alt="Profile"
            className="h-12 w-12 rounded-full border border-slate-700 object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-sm font-medium text-slate-300">
            {(name?.[0] || profile.email?.[0] || "U").toUpperCase()}
          </div>
        )}
        <div>
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Username"
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-base text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <button
                type="button"
                onClick={() => setEditingName(false)}
                className="text-sm text-brand hover:underline"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">
                {name || profile.email?.split("@")[0] || "Username"}
              </h1>
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="text-sm text-brand hover:underline"
                aria-label="Edit username"
                title="Edit username"
              >
                ✎
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-1 text-sm text-brand hover:underline"
          >
            Change profile picture
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error && (
          <div className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
        {savedHint && (
          <div className="rounded-lg bg-green-500/20 px-4 py-2 text-sm text-green-300">
            {savedHint}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-sm text-slate-400">Skills</span>
          <p className="text-xs text-slate-500">
            Tap to toggle. You can pick several — they help match you to projects and roles.
          </p>
          <div className="flex flex-wrap gap-2">
            {SKILL_OPTIONS.map((skill) => {
              const selected = skills.includes(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`rounded-full border px-3 py-1 text-sm transition ${
                    selected
                      ? "border-brand bg-brand/20 text-brand"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-brand/50"
                  }`}
                >
                  {skill}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="block text-sm text-slate-400 mb-2">Links (portfolio, GitHub, etc.)</span>
          <div className="flex flex-col gap-2">
            {links.map((link, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => updateLink(i, "url", e.target.value)}
                  placeholder={link.label === "Photo" ? "Photo URL (https://...)" : "https://..."}
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
            <button
              type="button"
              onClick={addPhotoLink}
              className="self-start text-sm text-brand hover:underline"
            >
              + Add photo link
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

        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={dmEmailNotifications}
            onChange={(e) => setDmEmailNotifications(e.target.checked)}
            className="mt-0.5 rounded border-slate-600 bg-slate-900 text-brand focus:ring-brand"
          />
          <span className="text-sm text-slate-300">
            Email me about new messages
            <span className="block text-xs text-slate-500">
              Only if you haven&apos;t seen them within a few minutes. Bursts from
              the same sender are combined into a single email.
            </span>
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

      <nav
        className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-800 pt-6 text-sm text-slate-500"
        aria-label="Related pages"
      >
        <Link href="/" className="hover:text-slate-200">
          Home feed
        </Link>
        <Link href="/explore" className="hover:text-slate-200">
          Explore
        </Link>
        <Link href={`/profile/${profile.id}`} className="hover:text-slate-200">
          View public profile
        </Link>
      </nav>
    </div>
  );
}
