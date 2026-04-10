"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { resolveAuthCallbackUrl } from "@/lib/auth-callback-url";

function SignInForm() {
  const searchParams = useSearchParams();
  const callbackPath = searchParams.get("callbackUrl") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "CredentialsSignin") {
      setError("Invalid email or password. Check your email and password, or sign up if you don’t have an account.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // redirect: true so NextAuth sets the session cookie via the redirect response
      const redirectUrl = resolveAuthCallbackUrl(
        callbackPath,
        window.location.origin
      );
      await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        callbackUrl: redirectUrl,
        redirect: true
      });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    const redirectUrl = resolveAuthCallbackUrl(callbackPath, window.location.origin);
    await signIn("google", { callbackUrl: redirectUrl });
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-semibold">Sign in</h1>
      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 hover:border-slate-600"
      >
        Continue with Google
      </button>
      <div className="mb-4 flex items-center gap-3 text-xs text-slate-500">
        <div className="h-px flex-1 bg-slate-800" />
        <span>or use email</span>
        <div className="h-px flex-1 bg-slate-800" />
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-400">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-400">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-light disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-400">
        Don&apos;t have an account?{" "}
        <Link href="/auth/signup" className="text-brand hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-sm text-slate-400">Loading…</div>}>
      <SignInForm />
    </Suspense>
  );
}
