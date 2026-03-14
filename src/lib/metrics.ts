/**
 * Instrumentation for north-star and supporting metrics.
 * Extend with PostHog, Amplitude, or custom backend for production.
 */

export type MetricEvent =
  | { name: "project_created"; projectId: string; userId: string }
  | { name: "project_published"; projectId: string; userId: string }
  | { name: "project_active"; projectId: string; userId: string }
  | { name: "project_closed"; projectId: string; userId: string }
  | { name: "application_created"; applicationId: string; projectId: string; userId: string }
  | { name: "offer_sent"; offerId: string; projectId: string; userId: string }
  | { name: "offer_accepted"; offerId: string; projectId: string; userId: string }
  | { name: "offer_declined"; offerId: string; projectId: string; userId: string }
  | { name: "user_signed_up"; userId: string }
  | { name: "user_signed_in"; userId: string };

/** North-star: % of published projects reaching Active within 30 days */
export const NORTH_STAR_METRIC = "project_active";

/** Supporting metrics */
export const SUPPORTING_METRICS = [
  "project_published",
  "application_created",
  "offer_accepted",
  "time_to_first_application",
  "roles_filled_per_project"
] as const;

function log(event: MetricEvent) {
  if (process.env.NODE_ENV === "development") {
    console.log("[metrics]", event.name, event);
  }
  // TODO: Send to analytics provider (PostHog, Amplitude, etc.)
  // e.g. analytics.track(event.name, event);
}

export function track(event: MetricEvent) {
  try {
    log(event);
  } catch (e) {
    console.error("Metrics track error:", e);
  }
}
