import { validatePublishChecklist } from "../project-validation";

describe("validatePublishChecklist", () => {
  const validProject = {
    title: "My Project",
    pitch: "A great idea",
    problem: null,
    solution: null,
    hoursPerWeek: 10,
    durationMonths: 3,
    rewardModels: JSON.stringify([{ type: "Paid" }]),
    roles: [{ title: "Developer", openings: 1, requirements: null }]
  };

  it("returns overall true when all criteria are met", () => {
    const result = validatePublishChecklist(validProject);
    expect(result.pitch).toBe(true);
    expect(result.expectations).toBe(true);
    expect(result.rewardModel).toBe(true);
    expect(result.roles).toBe(true);
    expect(result.overall).toBe(true);
  });

  it("fails pitch when title is missing", () => {
    const result = validatePublishChecklist({
      ...validProject,
      title: ""
    });
    expect(result.pitch).toBe(false);
    expect(result.overall).toBe(false);
  });

  it("passes pitch when problem/solution provided instead of pitch", () => {
    const result = validatePublishChecklist({
      ...validProject,
      pitch: null,
      problem: "The problem",
      solution: "The solution"
    });
    expect(result.pitch).toBe(true);
  });

  it("fails expectations when hoursPerWeek is 0", () => {
    const result = validatePublishChecklist({
      ...validProject,
      hoursPerWeek: 0
    });
    expect(result.expectations).toBe(false);
    expect(result.overall).toBe(false);
  });

  it("fails expectations when durationMonths is missing", () => {
    const result = validatePublishChecklist({
      ...validProject,
      durationMonths: null
    });
    expect(result.expectations).toBe(false);
  });

  it("fails rewardModel when rewardModels is empty", () => {
    const result = validatePublishChecklist({
      ...validProject,
      rewardModels: "[]"
    });
    expect(result.rewardModel).toBe(false);
    expect(result.overall).toBe(false);
  });

  it("fails roles when no roles", () => {
    const result = validatePublishChecklist({
      ...validProject,
      roles: []
    });
    expect(result.roles).toBe(false);
    expect(result.overall).toBe(false);
  });

  it("fails roles when role has empty title", () => {
    const result = validatePublishChecklist({
      ...validProject,
      roles: [{ title: "  ", openings: 1, requirements: null }]
    });
    expect(result.roles).toBe(false);
  });
});
