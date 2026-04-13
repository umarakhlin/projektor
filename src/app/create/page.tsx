"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import type { ProjectInput, RoleInput, RewardModel } from "@/lib/project-validation";
import {
  FEED_ROLE_TITLE_OPTIONS,
  isFeedRoleTitleValue,
  normalizeToFeedRoleTitle
} from "@/lib/feed-role-titles";
import { parseJsonArray } from "@/lib/safe-json";

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
const CREATE_DRAFT_KEY = "projektor.create.draft.v1";

const STEP_GUIDE = [
  {
    title: "Basics",
    hint: "Give your project a clear name and explain the idea. Stage and category help the right people discover it."
  },
  {
    title: "Time and rewards",
    hint: "Set realistic weekly hours and duration so applicants know what to expect. Pick how collaborators can be compensated or motivated."
  },
  {
    title: "Roles",
    hint: "List each role you need, how many people, and skills. These appear when people browse and apply."
  },
  {
    title: "Review and publish",
    hint: "Confirm the checklist is green, then publish. You can still edit the project later from its page."
  }
] as const;

type ApiDraftProject = {
  id: string;
  status: string;
  title: string;
  pitch: string | null;
  problem: string | null;
  solution: string | null;
  stage: string;
  category: string;
  hoursPerWeek: number | null;
  durationMonths: number | null;
  rewardModels: string | null;
  roles: {
    title: string;
    requirements: string | null;
    openings: number;
    timeExpectation?: string | null;
  }[];
};

function normalizedRewardModelItems(raw: string | null) {
  return parseJsonArray<unknown>(raw ?? null)
    .map((item) => {
      if (item == null || typeof item !== "object") return null;
      const type = (item as { type?: unknown }).type;
      if (typeof type !== "string") return null;
      const normalizedType = type.trim();
      return normalizedType ? { type: normalizedType } : null;
    })
    .filter((item): item is { type: string } => item !== null);
}

/** Skills: one per line (best), or comma-separated. Multi-word skills like "User research" are OK. */
function parseSkillsFromInput(raw: string): string[] {
  const lines = raw.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    for (const part of line.split(",")) {
      const s = part.trim();
      if (s) out.push(s);
    }
  }
  return out;
}

function inferResumeStep(p: ApiDraftProject): number {
  const rewards = normalizedRewardModelItems(p.rewardModels);
  const hasPitch = !!(
    p.title?.trim() &&
    (p.pitch?.trim() || p.problem?.trim() || p.solution?.trim())
  );
  if (!hasPitch) return 1;
  const hasExpectations =
    typeof p.hoursPerWeek === "number" &&
    p.hoursPerWeek > 0 &&
    typeof p.durationMonths === "number" &&
    p.durationMonths > 0 &&
    rewards.length > 0;
  if (!hasExpectations) return 2;
  const validRoles = (p.roles ?? []).filter((r) => r.title?.trim());
  if (validRoles.length === 0) return 3;
  return 4;
}

function CreateProjectPageInner() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [hydratingDraft, setHydratingDraft] = useState(false);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: { available?: boolean }) => setAiAvailable(!!d?.available))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || draftLoaded) return;

    const draftId = searchParams.get("draft");
    if (draftId) {
      setHydratingDraft(true);
      fetch(`/api/projects/${draftId}`)
        .then(async (res) => {
          if (res.status === 403 || res.status === 404) {
            setError("Could not load this draft. It may have been removed.");
            return;
          }
          if (!res.ok) {
            setError("Could not load draft.");
            return;
          }
          const p = (await res.json()) as ApiDraftProject;
          if (p.status !== "Draft") {
            setError("This project is not a draft.");
            return;
          }
          setProjectId(p.id);
          setTitle(p.title ?? "");
          setPitch(p.pitch ?? "");
          setProblem(p.problem ?? "");
          setSolution(p.solution ?? "");
          if (p.stage && STAGES.some((s) => s.value === p.stage)) {
            setStage(p.stage as ProjectStage);
          }
          if (p.category && CATEGORIES.some((c) => c.value === p.category)) {
            setCategory(p.category as ProjectCategory);
          }
          if (typeof p.hoursPerWeek === "number") {
            setHoursPerWeek(p.hoursPerWeek);
          } else {
            setHoursPerWeek("");
          }
          if (typeof p.durationMonths === "number") {
            setDurationMonths(p.durationMonths);
          } else {
            setDurationMonths("");
          }
          const rewardItems = normalizedRewardModelItems(p.rewardModels);
          setRewardModels(
            rewardItems.map((item) => ({ type: item.type as RewardModel["type"] }))
          );
          const roleRows: RoleInput[] =
            Array.isArray(p.roles) && p.roles.length > 0
              ? p.roles.map((r) => {
                  const rawTitle = r.title ?? "";
                  const title = isFeedRoleTitleValue(rawTitle)
                    ? rawTitle
                    : normalizeToFeedRoleTitle(rawTitle);
                  return {
                    title,
                    requirements: parseJsonArray<unknown>(r.requirements ?? null)
                      .map((x) => (typeof x === "string" ? x.trim() : ""))
                      .filter(Boolean),
                    openings: Math.max(1, r.openings ?? 1),
                    ...(r.timeExpectation?.trim()
                      ? { timeExpectation: r.timeExpectation.trim() }
                      : {})
                  };
                })
              : [{ title: "", requirements: [], openings: 1 }];
          setRoles(roleRows);
          setStep(inferResumeStep(p));
          router.replace("/create");
        })
        .catch(() => setError("Could not load draft."))
        .finally(() => {
          setHydratingDraft(false);
          setDraftLoaded(true);
        });
      return;
    }

    try {
      const raw = window.localStorage.getItem(CREATE_DRAFT_KEY);
      if (!raw) {
        setDraftLoaded(true);
        return;
      }
      const d = JSON.parse(raw) as Partial<{
        step: number;
        projectId: string | null;
        title: string;
        pitch: string;
        problem: string;
        solution: string;
        stage: ProjectStage;
        category: ProjectCategory;
        hoursPerWeek: number | "";
        durationMonths: number | "";
        rewardModels: RewardModel[];
        roles: RoleInput[];
      }>;
      if (typeof d.step === "number" && d.step >= 1 && d.step <= 4) setStep(d.step);
      if (typeof d.projectId === "string" || d.projectId === null) setProjectId(d.projectId ?? null);
      if (typeof d.title === "string") setTitle(d.title);
      if (typeof d.pitch === "string") setPitch(d.pitch);
      if (typeof d.problem === "string") setProblem(d.problem);
      if (typeof d.solution === "string") setSolution(d.solution);
      if (d.stage && STAGES.some((s) => s.value === d.stage)) setStage(d.stage);
      if (d.category && CATEGORIES.some((c) => c.value === d.category)) setCategory(d.category);
      if (typeof d.hoursPerWeek === "number" || d.hoursPerWeek === "") setHoursPerWeek(d.hoursPerWeek);
      if (typeof d.durationMonths === "number" || d.durationMonths === "") setDurationMonths(d.durationMonths);
      if (Array.isArray(d.rewardModels)) setRewardModels(d.rewardModels);
      if (Array.isArray(d.roles) && d.roles.length > 0) setRoles(d.roles);
    } catch {
      // Ignore broken local draft payload.
    } finally {
      setDraftLoaded(true);
    }
  }, [status, draftLoaded, searchParams, router]);

  useEffect(() => {
    if (status !== "authenticated" || !draftLoaded) return;
    const draft = {
      step,
      projectId,
      title,
      pitch,
      problem,
      solution,
      stage,
      category,
      hoursPerWeek,
      durationMonths,
      rewardModels,
      roles
    };
    window.localStorage.setItem(CREATE_DRAFT_KEY, JSON.stringify(draft));
  }, [
    status,
    draftLoaded,
    step,
    projectId,
    title,
    pitch,
    problem,
    solution,
    stage,
    category,
    hoursPerWeek,
    durationMonths,
    rewardModels,
    roles
  ]);

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
      setRoles((prev) => [
        ...prev,
        ...data.roles.map((r: { title: string; requirements: string[]; openings?: number }) => ({
          title: normalizeToFeedRoleTitle(r.title ?? ""),
          requirements: r.requirements ?? [],
          openings: r.openings ?? 1
        }))
      ]);
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
        window.localStorage.removeItem(CREATE_DRAFT_KEY);
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
    const rewardModels = parseJsonArray<unknown>(p.rewardModels)
      .map((item) => {
        if (item == null || typeof item !== "object") return null;
        const type = (item as { type?: unknown }).type;
        if (typeof type !== "string") return null;
        const normalizedType = type.trim();
        return normalizedType ? { type: normalizedType } : null;
      })
      .filter((item): item is { type: string } => item !== null);
    const c = {
      pitch: !!(p.title && (p.pitch || p.problem || p.solution)),
      expectations:
        typeof p.hoursPerWeek === "number" &&
        p.hoursPerWeek > 0 &&
        typeof p.durationMonths === "number" &&
        p.durationMonths > 0,
      rewardModel: rewardModels.length > 0,
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

  if (status === "loading" || !draftLoaded || hydratingDraft) {
    return <div className="mx-auto max-w-xl text-slate-400">Loading…</div>;
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-2 text-2xl font-semibold">Create project</h1>
      <p className="mb-6 text-sm text-slate-400">
        Four short steps. Your progress is saved automatically as a draft — you can leave anytime and continue from{" "}
        <Link href="/my-projects" className="text-brand hover:underline">
          My Projects
        </Link>
        .
      </p>
      <div className="mb-2 flex gap-2" role="list" aria-label="Creation steps">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            role="listitem"
            aria-current={step === s ? "step" : undefined}
            title={`Step ${s} of 4`}
            className={`h-2 flex-1 rounded-full transition-colors ${
              s <= step ? "bg-brand" : "bg-slate-700"
            }`}
          />
        ))}
      </div>
      <div className="mb-6 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3">
        <p className="text-sm font-medium text-slate-200">
          Step {step} of 4 · {STEP_GUIDE[step - 1].title}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          {STEP_GUIDE[step - 1].hint}
        </p>
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
            <span className="text-sm text-slate-400">Pitch / short description</span>
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
          <p className="text-xs text-slate-500">
            To continue to the next step, fill in{" "}
            <span className="text-slate-400">at least one</span> of: pitch, problem, or solution (in
            addition to the title).
          </p>
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
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-slate-400">
              For each role: pick the type (matches Explore filters), set{" "}
              <strong className="font-medium text-slate-300">how many people</strong> you need,
              then list skills — <strong className="font-medium text-slate-300">one per line</strong>{" "}
              (or comma-separated). Spaces inside a skill are fine (e.g. “React Native”).
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
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-slate-300">Role type</span>
                  <span className="text-xs text-slate-500">
                    Same categories people use when browsing the feed.
                  </span>
                  <select
                    value={role.title}
                    onChange={(e) => updateRole(i, "title", e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-slate-50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    <option value="">Choose a role…</option>
                    {FEED_ROLE_TITLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                    {role.title.trim() && !isFeedRoleTitleValue(role.title) ? (
                      <option value={role.title}>{role.title} (update to a standard role)</option>
                    ) : null}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-slate-300">
                    Spots / headcount for this role
                  </span>
                  <span className="text-xs text-slate-500">
                    Use the arrows or type a number — how many people for this role (minimum 1).
                  </span>
                  <div className="flex w-fit max-w-full items-stretch gap-0 overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      aria-label="Number of people for this role"
                      value={role.openings}
                      onChange={(e) =>
                        updateRole(i, "openings", Math.max(1, parseInt(e.target.value, 10) || 1))
                      }
                      className="w-16 min-w-0 border-0 bg-transparent py-2.5 pl-3 pr-2 text-center text-slate-50 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-brand [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <div className="flex flex-col border-l border-slate-700">
                      <button
                        type="button"
                        aria-label="Increase headcount"
                        className="flex flex-1 items-center justify-center px-2.5 text-xs text-slate-300 hover:bg-slate-800 active:bg-slate-800/80"
                        onClick={() =>
                          updateRole(i, "openings", Math.max(1, (role.openings ?? 1) + 1))
                        }
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        aria-label="Decrease headcount"
                        className="flex flex-1 items-center justify-center border-t border-slate-700 px-2.5 text-xs text-slate-300 hover:bg-slate-800 active:bg-slate-800/80 disabled:opacity-40"
                        disabled={(role.openings ?? 1) <= 1}
                        onClick={() =>
                          updateRole(i, "openings", Math.max(1, (role.openings ?? 1) - 1))
                        }
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-slate-300">Skills (optional)</span>
                  <span className="text-xs text-slate-500">
                    Put each skill on its own line. You can also use commas on one line. Multi-word
                    skills are OK.
                  </span>
                  <textarea
                    rows={4}
                    value={(role.requirements ?? []).join("\n")}
                    onChange={(e) =>
                      updateRole(i, "requirements", parseSkillsFromInput(e.target.value))
                    }
                    placeholder={`e.g.\nReact\nTypeScript\nUser research`}
                    className="resize-y rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-slate-50 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </label>
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

export default function CreateProjectPage() {
  return (
    <Suspense
      fallback={<div className="mx-auto max-w-xl text-slate-400">Loading…</div>}
    >
      <CreateProjectPageInner />
    </Suspense>
  );
}
