import { isProfileComplete } from "@/lib/profile-completion";

describe("isProfileComplete", () => {
  it("returns true when profile has name, avatar and skills", () => {
    expect(
      isProfileComplete({
        name: "Umar",
        skills: ["Frontend"],
        settings: { avatarUrl: "https://example.com/a.png" }
      })
    ).toBe(true);
  });

  it("returns false when avatar missing", () => {
    expect(
      isProfileComplete({
        name: "Umar",
        skills: ["Frontend"],
        settings: {}
      })
    ).toBe(false);
  });

  it("returns false for null profile", () => {
    expect(isProfileComplete(null)).toBe(false);
  });
});
