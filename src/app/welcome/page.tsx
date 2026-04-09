import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function WelcomePage() {
  const session = await getServerSession(authOptions);
  const firstName =
    session?.user?.name?.trim().split(" ")[0] ||
    session?.user?.email?.split("@")[0] ||
    "there";

  return (
    <div className="mx-auto max-w-2xl text-center">
      <h1 className="text-3xl font-semibold text-slate-50">
        Welcome to Projektor, {firstName}
      </h1>
      <p className="mt-3 text-slate-300">
        You are all set. Complete your profile, create a project, or explore
        what others are building.
      </p>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/profile"
          className="inline-flex w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-5 py-2.5 font-medium text-slate-100 hover:border-slate-600 sm:w-auto"
        >
          Complete profile
        </Link>
        <Link
          href="/create"
          className="inline-flex w-full items-center justify-center rounded-lg bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-light sm:w-auto"
        >
          Create a project
        </Link>
        <Link
          href="/explore"
          className="inline-flex w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-5 py-2.5 font-medium text-slate-100 hover:border-slate-600 sm:w-auto"
        >
          Explore projects
        </Link>
      </div>
    </div>
  );
}
