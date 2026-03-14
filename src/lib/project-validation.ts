import type { ProjectStage, ProjectCategory } from "@prisma/client";
import { parseJsonArray } from "./safe-json";

export type RewardModel = 
  | { type: "Paid"; currency?: string; range?: string; schedule?: string }
  | { type: "EquityPartnership"; range?: string; vestingNote?: string }
  | { type: "RevenueShare"; range?: string; basis?: string; payoutCadence?: string }
  | { type: "PortfolioExperience"; description?: string }
  | { type: "Volunteer"; causeNote?: string }
  | { type: "Hackathon"; dates?: string; format?: string; rulesLink?: string };

export type RoleInput = {
  title: string;
  requirements?: string[];
  timeExpectation?: string;
  openings: number;
  compensationOverride?: RewardModel;
};

export type ProjectInput = {
  title: string;
  pitch?: string;
  problem?: string;
  solution?: string;
  stage: ProjectStage;
  category: ProjectCategory;
  hoursPerWeek?: number;
  durationMonths?: number;
  rewardModels?: RewardModel[];
  roles?: RoleInput[];
};

export type PublishChecklist = {
  pitch: boolean;
  expectations: boolean;
  rewardModel: boolean;
  roles: boolean;
  overall: boolean;
};

export function validatePublishChecklist(project: {
  title?: string | null;
  pitch?: string | null;
  problem?: string | null;
  solution?: string | null;
  hoursPerWeek?: number | null;
  durationMonths?: number | null;
  rewardModels?: string | null;
  roles?: { title: string; openings: number; requirements?: string | null }[];
}): PublishChecklist {
  const hasPitch =
    !!project.title?.trim() &&
    (!!project.pitch?.trim() || !!project.problem?.trim() || !!project.solution?.trim());
  const hasExpectations =
    typeof project.hoursPerWeek === "number" &&
    project.hoursPerWeek > 0 &&
    typeof project.durationMonths === "number" &&
    project.durationMonths > 0;
  const hasRewardModel =
    !!project.rewardModels?.trim() &&
    parseJsonArray<RewardModel>(project.rewardModels).length > 0;
  const hasRoles =
    Array.isArray(project.roles) &&
    project.roles.length > 0 &&
    project.roles.every((r) => !!r.title?.trim() && r.openings > 0);

  return {
    pitch: hasPitch,
    expectations: hasExpectations,
    rewardModel: hasRewardModel,
    roles: hasRoles,
    overall: hasPitch && hasExpectations && hasRewardModel && hasRoles
  };
}
