import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseJsonArray, parseJsonObject } from "@/lib/safe-json";
import { OnboardingWizard } from "./onboarding-wizard";

type StoredSettings = { avatarUrl?: string };

export default async function WelcomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/welcome");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      name: true,
      skills: true,
      availability: true,
      settings: true
    }
  });

  if (!user) {
    redirect("/auth/signin?callbackUrl=/welcome");
  }

  const initial = {
    email: user.email,
    name: user.name,
    skills: parseJsonArray<string>(user.skills),
    availability: user.availability,
    settings: parseJsonObject<StoredSettings>(user.settings, {})
  };

  const firstName =
    user.name?.trim().split(" ")[0] ||
    user.email?.split("@")[0] ||
    "there";

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-brand">
          Quick setup · 1 minute
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-50">
          Welcome, {firstName}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          A few quick details so people on Projektor can find and work with you.
        </p>
      </div>

      <OnboardingWizard initial={initial} />
    </div>
  );
}
