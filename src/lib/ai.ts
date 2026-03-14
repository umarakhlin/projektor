/**
 * AI layer - LLM integration for Projektor.
 * Uses OpenAI API when OPENAI_API_KEY is set.
 * Falls back to no-op / mock when key is missing.
 */

const API_KEY = process.env.OPENAI_API_KEY;

export function isAiAvailable(): boolean {
  return Boolean(API_KEY?.trim());
}

export async function complete(prompt: string, systemPrompt?: string): Promise<string> {
  if (!isAiAvailable()) return "";

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
          { role: "user" as const, content: prompt }
        ],
        max_tokens: 1024,
        temperature: 0.7
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("OpenAI API error:", res.status, err);
      return "";
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() ?? "";
  } catch (e) {
    console.error("AI complete error:", e);
    return "";
  }
}

/** Suggest improved pitch / problem / solution text */
export async function suggestProjectStructure(input: {
  pitch?: string;
  problem?: string;
  solution?: string;
  stage?: string;
  category?: string;
}): Promise<{ pitch?: string; problem?: string; solution?: string }> {
  const text = [
    input.pitch && `Pitch: ${input.pitch}`,
    input.problem && `Problem: ${input.problem}`,
    input.solution && `Solution: ${input.solution}`,
    input.stage && `Stage: ${input.stage}`,
    input.category && `Category: ${input.category}`
  ]
    .filter(Boolean)
    .join("\n");

  if (!text.trim()) return {};

  const prompt = `Improve this project description for clarity and impact. Return valid JSON only: { "pitch": "...", "problem": "...", "solution": "..." }. Use the same keys; omit keys you don't improve.`;
  const out = await complete(prompt, "You are a helpful assistant that improves project descriptions. Output only valid JSON.");

  try {
    const parsed = JSON.parse(out) as Record<string, string>;
    return {
      pitch: parsed.pitch ?? input.pitch,
      problem: parsed.problem ?? input.problem,
      solution: parsed.solution ?? input.solution
    };
  } catch {
    return {};
  }
}

/** Suggest roles for a project */
export async function suggestRoles(input: {
  title: string;
  pitch?: string;
  stage?: string;
  category?: string;
  existingRoles?: string[];
}): Promise<{ title: string; requirements: string[]; openings?: number }[]> {
  const existing = input.existingRoles?.length ? `Existing roles: ${input.existingRoles.join(", ")}` : "";
  const prompt = `Project: ${input.title}. ${input.pitch || ""} Stage: ${input.stage || "Idea"}. Category: ${input.category || "Other"}. ${existing}

Suggest 2-4 roles that would help this project. Return valid JSON array: [ { "title": "Role Title", "requirements": ["skill1","skill2"], "openings": 1 } ].`;

  const out = await complete(prompt, "You are a startup/creative project advisor. Suggest practical roles. Output only a valid JSON array.");

  try {
    const arr = JSON.parse(out) as { title?: string; requirements?: string[]; openings?: number }[];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((r) => r.title)
      .map((r) => ({
        title: String(r.title),
        requirements: Array.isArray(r.requirements) ? r.requirements : [],
        openings: typeof r.openings === "number" ? r.openings : 1
      }))
      .slice(0, 6);
  } catch {
    return [];
  }
}
