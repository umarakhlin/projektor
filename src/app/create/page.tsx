"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { ProjectInput, RoleInput, RewardModel } from "@/lib/project-validation";

const STAGES = [
  { value: "Idea", label: "Idea" },
  { value: "Validation", label: "Validation" },
  { value: "Building", label: "Building" },
  { value: "Launched", label: "Launched" }
] as const;

const CATEGORIES = [
  { value: "SaaS", label: "SaaS" },
  { value: "Hardware", label: "Hardware" },
  { value: "Creative", label: "Creative" },
  { value: "NonProfit", label: "Non-profit" },
  { value: "Other", label: "Other" }
] as const;

const REWARD_TYPES = [
  { value: "Paid", label: "Paid" },
  { value: "EquityPartnership", label: "Equity / Partnership" },
  { value: "RevenueShare", label: "Revenue share" },
  { value: "PortfolioExperience", label: "Portfolio / Experience" },
  { value: "Volunteer", label: "Volunteer" },
  { value: "Hackathon", label: "Hackathon" }
] as const;

type ProjectStage = (typeof STAGES)[number]["value"];
type ProjectCategory = (typeof CATEGORIES)[number]["value"];

export default function CreateProjectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [pitch, setPitch] = useState("");
  const [problem, setProblem] = useState("");
  const [solution, setSolution] = useState("");
  const [stage, setStage] = useState<ProjectStage>("Idea");
  const [category, setCategory] = useState<ProjectCategory>("Other");

  const [hoursPerWeek, setHoursPerWeek] = useState<number | "">("");
  const [durationMonths, setDurationMonths] = useState<number | "">("");
  const [rewardModels, setRewardModels] = useState<RewardModel[]>([]);

  const [roles, setRoles] = useState<RoleInput[]>([
    { title: "", requirements: [], openings: 1 }
  ]);

  const [checklist, setChecklist] = useState<{
    pitch: boolean;
    expectations: boolean;
    rewardModel: boolean;
    roles: boolean;
  } | null>(null);

  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: { available?: boolean }) => setAiAvailable(!!d?.available))
      .catch(() => {});
  }, []);

  async function improveWithAi() {
    if (!pitch && !problem && !solution) return;
    setAiLoading(true);
    const res = await fetch("/api/ai/suggest-structure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pitch, problem, solution, stage, category })
    });
    const data = await res.json().catch(() => ({}));
    if (data.pitch) setPitch(data.pitch);
    if (data.problem) setProblem(data.problem);
    if (data.solution) setSolution(data.solution);
    setAiLoading(false);
  }

  async function suggestRolesAi() {
    if (!title.trim()) return;
    setAiLoading(true);
    const res = await fetch("/api/ai/suggest-roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        pitch,
        stage,
        category,
        existingRoles: roles.filter((r) => r.title.trim()).map((r) => r.title)
      })
    });
    const data = await res.json().catch(() => ({}));
    if (data.roles?.length) {
      setRoles((prev) => [...prev, ...data.roles.map((r: { title: string; requirements: string[]; openings?: number }) =>
        ({ title: r.title, requirements: r.requirements ?? [], openings: r.openings ?? 1 })
      )]);
    }
    setAiLoading(false);
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/create");
    }
  }, [status, router]);

  function addRole() {
    setRoles((prev) => [...prev, { title: "", requirements: [], openings: 1 }]);
  }

  function removeRole(i: number) {
    setRoles((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateRole(i: number, field: keyof RoleInput, value: unknown) {
    setRoles((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  function addRewardType(type: string) {
    if (rewardModels.some((r) => r.type === type)) return;
    setRewardModels((prev) => [...prev, { type: type as RewardModel["type"] }]);
  }

  function removeRewardType(type: string) {
    setRewardModels((prev) => prev.filter((r) => r.type !== type));
  }

  async function handleNext() {
    setError("");
    setLoading(true);

    try {
      if (step === 1) {
        if (!pitch?.trim() && !problem?.trim() && !solution?.trim()) {
          setError("Add a pitch, problem, or solution");
          setLoading(false);
          return;
        }
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            pitch: pitch?.trim() || null,
            problem: problem?.trim() || null,
            solution: solution?.trim() || null,
            stage,
            category,
            rewardModels: [],
            roles: []
          })
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error ?? "Failed to create");
        }
        const data = await res.json();
        setProjectId(data.id);
      } else if (projectId && step === 2) {
        if (!hoursPerWeek || !durationMonths || rewardModels.length === 0) {
          setError("Fill hours/week, duration, and select at least one reward type");
          setLoading(false);
          return;
        }
        const res = await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hoursPerWeek: hoursPerWeek || undefined,
            durationMonths: durationMonths || undefined,
            rewardModels: rewardModels.length ? rewardModels : undefined
          })
        });
        if (!res.ok) throw new Error("Failed to save");
      } else if (projectId && step === 3) {
        const validRoles = roles
          .filter((r) => r.title.trim())
          .map((r) => ({
            ...r,
            openings: Math.max(1, r.openings ?? 1)
          }));
        if (validRoles.length === 0) {
          setError("Add at least one role");
          setLoading(false);
          return;
        }
        const res = await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roles: validRoles })
        });
        if (!res.ok) throw new Error("Failed to save");
      }

      if (step === 4) {
        const res = await fetch(`/api/projects/${projectId}/publish`, {
          method: "POST"
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          if (d.checklist) setChecklist(d.checklist);
          throw new Error(d.error ?? "Cannot publish");
        }
        router.push(`/projects/${projectId}`);
        router.refresh();
        return;
      }

      setStep((s) => s + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function loadChecklist() {
    if (!projectId) return;
    const res = await fetch(`/api/projects/${projectId}`);
    if (!res.ok) return;
    const p = await res.json();
    const c = {
      pitch: !!(p.title && (p.pitch || p.problem || p.solution)),
      expectations:
        typeof p.hoursPerWeek === "number" &&
        p.hoursPerWeek > 0 &&
        typeof p.durationMonths === "number" &&
        p.durationMonths > 0,
      rewardModel:
        !!p.rewardModels && JSON.parse(p.rewardModels || "[]").length > 0,
      roles:
        Array.isArray(p.roles) &&
        p.roles.length > 0 &&
        p.roles.every((r: { title: string; openings: number }) => r.title && r.openings > 0)
    };
    setChecklist(c);
  }

  useEffect(() => {
    if (step === 4 && projectId) loadChecklist();
  }, [step, projectId]);

  const canPublish = checklist?.pitch && checklist?.expectations && checklist?.rewardModel && checklist?.roles;

  if (status === "loading") {
    return <div className="mx-auto max-w-xl text-slate-400">Loading…</div>;
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-semibold">Create project</h1>
      <div className="mb-6 flex gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full ${
              s <= step ? "bg-brand" : "bg-slate-700"
            }`}
          />
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-400">Project title *</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Build a SaaS dashboard"
              required
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-400">Pitch / short description *</span>
            <textarea
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="What's the idea in one sentence?"
              rows={2}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-400">Problem</span>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="What problem does this solve?"
              rows={2}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-400">Solution</span>
            <textarea
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="How does your approach solve it?"
              rows={2}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-400">Stage</span>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as ProjectStage)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-400">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProjectCategory)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          {aiAvailable && (pitch || problem || solution) && (
            <button
              type="button"
              onClick={improveWithAi}
              disabled={aiLoading}
              className="self-start rounded border border-brand/50 px-3 py-1.5 text-sm text-brand hover:bg-brand/10 disabled:opacity-50"
            >
              {aiLoading ? "Improving…" : "Improve with AI"}
            </button>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-400">Hours per week *</span>
            <input
              type="number"
              min={1}
              value={hoursPerWeek}
              onChange={(e) =>
                setHoursPerWeek(e.target.value ? parseInt(e.target.value, 10) : "")
              }
              placeholder="e.g. 10"
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-400">Duration (months) *</span>
            <input
              type="number"
              min={1}
              value={durationMonths}
              onChange={(e) =>
                setDurationMonths(e.target.value ? parseInt(e.target.value, 10) : "")
              }
              placeholder="e.g. 3"
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </label>
          <div>
            <span className="block text-sm text-slate-400 mb-2">
              Reward model(s) * — select at least one
            </span>
            <div className="flex flex-wrap gap-2">
              {REWARD_TYPES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() =>
                    rewardModels.some((m) => m.type === r.value)
                      ? removeRewardType(r.value)
                      : addRewardType(r.value)
                  }
                  className={`rounded-full px-4 py-2 text-sm ${
                    rewardModels.some((m) => m.type === r.value)
                      ? "bg-brand text-white"
                      : "border border-slate-600 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Add the roles you need. Each role should have a title and number of openings.
            </p>
            {aiAvailable && title.trim() && (
              <button
                type="button"
                onClick={suggestRolesAi}
                disabled={aiLoading}
                className="rounded border border-brand/50 px-3 py-1.5 text-sm text-brand hover:bg-brand/10 disabled:opacity-50"
              >
                {aiLoading ? "Suggesting…" : "Suggest roles (AI)"}
              </button>
            )}
          </div>
          {roles.map((role, i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-700 bg-slate-900/50 p-4"
            >
              <div className="mb-3 flex justify-between">
                <span className="text-sm font-medium">Role {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeRole(i)}
                  className="text-slate-400 hover:text-red-400"
                >
                  Remove
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={role.title}
                  onChange={(e) => updateRole(i, "title", e.target.value)}
                  placeholder="Role title (e.g. Frontend Developer)"
                  className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <input
                  type="number"
                  min={1}
                  value={role.openings}
                  onChange={(e) =>
                    updateRole(i, "openings", parseInt(e.target.value, 10) || 1)
                  }
                  placeholder="Openings"
                  className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
                <input
                  type="text"
                  value={(role.requirements ?? []).join(", ")}
                  onChange={(e) =>
                    updateRole(
                      i,
                      "requirements",
                      e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                    )
                  }
                  placeholder="Skills (comma-separated)"
                  className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addRole}
            className="self-start text-sm text-brand hover:underline"
          >
            + Add role
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Review & publish</h2>
          <p className="text-sm text-slate-400">
            Make sure everything is complete. You can edit your draft before publishing.
          </p>
          {checklist && (
            <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
              <p className="mb-3 text-sm font-medium">Publish checklist</p>
              <ul className="space-y-2 text-sm">
                <li className={checklist.pitch ? "text-green-400" : "text-red-400"}>
                  {checklist.pitch ? "✓" : "✗"} Pitch (title + description)
                </li>
                <li
                  className={checklist.expectations ? "text-green-400" : "text-red-400"}
                >
                  {checklist.expectations ? "✓" : "✗"} Expectations (hours/week + duration)
                </li>
                <li
                  className={checklist.rewardModel ? "text-green-400" : "text-red-400"}
                >
                  {checklist.rewardModel ? "✓" : "✗"} At least one reward model
                </li>
                <li className={checklist.roles ? "text-green-400" : "text-red-400"}>
                  {checklist.roles ? "✓" : "✗"} At least one role with title & openings
                </li>
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 flex justify-between">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="text-slate-400 hover:text-slate-50"
          >
            Back
          </button>
        ) : (
          <Link href="/" className="text-slate-400 hover:text-slate-50">
            Cancel
          </Link>
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={
            loading ||
            (step === 1 && !title.trim()) ||
            (step === 4 && !canPublish)
          }
          className="rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-light disabled:opacity-50"
        >
          {loading
            ? "Saving…"
            : step === 4
              ? "Publish"
              : "Next"}
        </button>
      </div>
    </div>
  );
}
