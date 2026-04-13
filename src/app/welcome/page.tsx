import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const steps = [
  {
    n: 1,
    title: "Complete your profile",
    body: "Add a display name, photo, and skills so teammates and projects can find you.",
    href: "/profile",
    cta: "Open profile"
  },
  {
    n: 2,
    title: "Create a project",
    body: "Post what you are building, roles you need, and how much time you expect.",
    href: "/create",
    cta: "Start a project"
  },
  {
    n: 3,
    title: "Explore and join",
    body: "Browse open projects, save ideas you like, and apply when something fits.",
    href: "/explore",
    cta: "Browse projects"
  }
] as const;

export default async function WelcomePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/welcome");
  }

  const firstName =
    session.user.name?.trim().split(" ")[0] ||
    session.user.email?.split("@")[0] ||
    "there";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-brand">
          You are in
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-50">
          Welcome, {firstName}
        </h1>
        <p className="mt-3 text-slate-300">
          Here is a simple path to get value from Projektor. Do them in order or jump
          ahead — whatever fits your goal.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block text-sm text-slate-400 underline decoration-slate-600 underline-offset-4 hover:text-slate-200"
        >
          Skip to feed
        </Link>
      </div>

      <ol className="mt-10 space-y-4">
        {steps.map((step) => (
          <li key={step.n}>
            <div className="flex gap-4 rounded-xl border border-slate-800 bg-slate-900/40 p-5 text-left transition hover:border-slate-700">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/20 text-sm font-bold text-brand"
                aria-hidden
              >
                {step.n}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-slate-100">{step.title}</h2>
                <p className="mt-1 text-sm text-slate-400">{step.body}</p>
                <Link
                  href={step.href}
                  className="mt-3 inline-flex text-sm font-medium text-brand hover:underline"
                >
                  {step.cta} →
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-8 text-center text-xs text-slate-500">
        Tip: A complete profile helps when you apply to roles or recruit teammates.
      </p>
    </div>
  );
}
