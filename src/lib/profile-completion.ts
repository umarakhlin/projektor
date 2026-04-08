export type MinimalProfile = {
  name?: string | null;
  skills?: string[];
  settings?: { avatarUrl?: string };
};

export function isProfileComplete(profile: MinimalProfile | null): boolean {
  if (!profile) return false;
  const hasName = !!profile.name?.trim();
  const hasSkills = Array.isArray(profile.skills) && profile.skills.length > 0;
  const hasAvatar = !!profile.settings?.avatarUrl;
  return hasName && hasSkills && hasAvatar;
}
