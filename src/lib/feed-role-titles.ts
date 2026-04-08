/** Canonical role titles — same set as Explore “Role needed” so filters stay aligned. */
export const FEED_ROLE_TITLE_OPTIONS = [
  { value: "Developer", label: "Developer" },
  { value: "Designer", label: "Designer" },
  { value: "Product", label: "Product" },
  { value: "Marketing", label: "Marketing" },
  { value: "Sales", label: "Sales" },
  { value: "Data", label: "Data" },
  { value: "AI", label: "AI" }
] as const;

export type FeedRoleTitleValue = (typeof FEED_ROLE_TITLE_OPTIONS)[number]["value"];

export const FEED_ROLE_TITLE_VALUES: FeedRoleTitleValue[] = FEED_ROLE_TITLE_OPTIONS.map(
  (o) => o.value
);

export function isFeedRoleTitleValue(s: string): s is FeedRoleTitleValue {
  return (FEED_ROLE_TITLE_VALUES as readonly string[]).includes(s);
}

/** Map free-text or AI output to the nearest feed role. */
export function normalizeToFeedRoleTitle(raw: string): FeedRoleTitleValue {
  const t = raw.trim();
  if (!t) return "Developer";
  if (isFeedRoleTitleValue(t)) return t;
  const lower = t.toLowerCase();
  for (const opt of FEED_ROLE_TITLE_OPTIONS) {
    const o = opt.value.toLowerCase();
    if (lower === o || lower.includes(o)) return opt.value;
  }
  if (/design|ui\b|ux\b|figma/.test(lower)) return "Designer";
  if (/product|pm\b|\bowner\b/.test(lower)) return "Product";
  if (/market|growth|content|seo/.test(lower)) return "Marketing";
  if (/sale|bd\b|business dev/.test(lower)) return "Sales";
  if (/data|analyst|analytics/.test(lower)) return "Data";
  if (/ai\b|llm|machine learning|\bml\b/.test(lower)) return "AI";
  if (/dev|engineer|frontend|backend|fullstack|software/.test(lower)) return "Developer";
  return "Developer";
}
