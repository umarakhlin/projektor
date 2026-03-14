"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function HomePage() {
  const { status } = useSession();
  const showWelcome = status === "unauthenticated";

  return (
    <div className="mx-auto max-w-2xl">
      {showWelcome && (
        <div className="mb-10 rounded-xl border border-slate-700 bg-slate-900/60 p-8 text-center">
          <h1 className="mb-6 text-2xl font-semibold text-slate-100">
            Welcome to Projektor
          </h1>
          <div className="flex flex-col items-center gap-3">
            <Link
              href="/auth/signup"
              className="w-full max-w-xs rounded-lg bg-brand px-4 py-3 text-sm font-medium text-white hover:bg-brand-light"
            >
              Sign up
            </Link>
            <Link
              href="/auth/signin"
              className="w-full max-w-xs rounded-lg border border-slate-600 px-4 py-3 text-sm font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-800/50"
            >
              Sign in
            </Link>
            <Link
              href="/explore"
              className="text-sm text-slate-400 underline hover:text-slate-300"
            >
              Browse as a visitor
            </Link>
          </div>
        </div>
      )}

      {status === "authenticated" && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-8 text-center">
          <p className="text-slate-300">What would you like to do?</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/explore"
              className="rounded-lg bg-brand px-4 py-3 text-sm font-medium text-white hover:bg-brand-light"
            >
              Explore projects
            </Link>
            <Link
              href="/create"
              className="rounded-lg border border-slate-600 px-4 py-3 text-sm font-medium text-slate-200 hover:border-slate-500 hover:bg-slate-800/50"
            >
              Create project
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
