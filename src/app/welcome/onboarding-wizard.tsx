"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

const AVAILABILITY_PRESETS = [
  "5 hours/week, evenings",
  "10 hours/week, weekends",
  "20 hours/week, flexible",
  "Full-time, available now"
] as const;

type Profile = {
  name: string | null;
  skills: string[];
  availability: string | null;
  email: string;
  settings: { avatarUrl?: string };
};

type StepId = 1 | 2 | 3;

export function OnboardingWizard({ initial }: { initial: Profile }) {
  const router = useRouter();
  const [step, setStep] = useState<StepId>(1);
  const [name, setName] = useState(initial.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initial.settings?.avatarUrl ?? "");
  const [skills, setSkills] = useState<string[]>(
    Array.isArray(initial.skills) ? initial.skills : []
  );
  const [availability, setAvailability] = useState(initial.availability ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step]);

  async function patchProfile(payload: Record<string, unknown>) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not save right now.");
        return false;
      }
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function saveStep1AndContinue() {
    const ok = await patchProfile({
      name: name.trim() || null,
      settings: { avatarUrl: avatarUrl.trim() || undefined }
    });
    if (ok) setStep(2);
  }

  async function saveStep2AndContinue() {
    const ok = await patchProfile({ skills });
    if (ok) setStep(3);
  }

  async function saveStep3AndFinish() {
    const ok = await patchProfile({
      availability: availability.trim() || null
    });
    if (ok) router.push("/");
  }

  function skipToHome() {
    router.push("/");
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

  function toggleSkill(skill: string) {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <ProgressBar step={step} />

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {step === 1 && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-xl font-semibold text-slate-50">
            Let&apos;s start with the basics
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            A clear name and photo help teammates recognize you across projects
            and chats.
          </p>

          <div className="mt-6 flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarFileChange}
              className="hidden"
            />
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar preview"
                className="h-16 w-16 rounded-full border border-slate-700 object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-lg font-medium text-slate-300">
                {(name?.[0] || initial.email?.[0] || "U").toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-500"
            >
              {avatarUrl ? "Change photo" : "Upload photo"}
            </button>
          </div>

          <label className="mt-6 flex flex-col gap-1">
            <span className="text-sm text-slate-300">Display name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Uma Rakhlin"
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={skipToHome}
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              Skip for now
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveStep1AndContinue()}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50"
            >
              {saving ? "Saving…" : "Continue"}
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-xl font-semibold text-slate-50">
            What do you do?
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Pick the skills that describe you best. We use these to match you
            with projects and roles.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {SKILL_OPTIONS.map((skill) => {
              const selected = skills.includes(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
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

          {skills.length === 0 && (
            <p className="mt-4 text-xs text-slate-500">
              You can pick more than one. Skip if none fit yet — you can edit
              later in your profile.
            </p>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              ← Back
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={skipToHome}
                className="text-sm text-slate-400 hover:text-slate-200"
              >
                Skip for now
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveStep2AndContinue()}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50"
              >
                {saving ? "Saving…" : "Continue"}
              </button>
            </div>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-xl font-semibold text-slate-50">
            How much time can you give?
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Optional, but it helps owners know if you fit before reaching out.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            {AVAILABILITY_PRESETS.map((preset) => {
              const selected = availability === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAvailability(preset)}
                  className={`rounded-lg border px-4 py-2 text-left text-sm transition ${
                    selected
                      ? "border-brand bg-brand/20 text-brand"
                      : "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500"
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>

          <label className="mt-6 flex flex-col gap-1">
            <span className="text-sm text-slate-300">Or write your own</span>
            <input
              type="text"
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              placeholder="e.g. 8 hours/week, mornings"
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-sm text-slate-400 hover:text-slate-200"
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveStep3AndFinish()}
              className="rounded-lg bg-brand px-5 py-2 text-sm font-medium text-white hover:bg-brand-light disabled:opacity-50"
            >
              {saving ? "Saving…" : "Finish setup"}
            </button>
          </div>
        </section>
      )}

      <p className="mt-6 text-center text-xs text-slate-500">
        You can edit any of this later from{" "}
        <Link href="/profile" className="hover:text-slate-300">
          your profile
        </Link>
        .
      </p>
    </div>
  );
}

function ProgressBar({ step }: { step: StepId }) {
  return (
    <div className="mb-6 flex items-center gap-2 text-xs text-slate-400">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex flex-1 items-center gap-2">
          <div
            className={`h-1.5 flex-1 rounded-full ${
              n <= step ? "bg-brand" : "bg-slate-800"
            }`}
          />
        </div>
      ))}
      <span className="ml-2 whitespace-nowrap text-slate-500">
        Step {step} of 3
      </span>
    </div>
  );
}
