"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name: name || undefined, password })
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    setLoading(false);
    setSuccess(true);
    setEmailSent(Boolean(data.emailSent));
    setVerificationUrl(typeof data.verificationUrl === "string" ? data.verificationUrl : null);
  }

  async function handleGoogleSignUp() {
    await signIn("google", { callbackUrl: "/welcome" });
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-semibold">Create an account</h1>
      <button
        type="button"
        onClick={handleGoogleSignUp}
        className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 hover:border-slate-600"
      >
        Continue with Google
      </button>
      <div className="mb-4 flex items-center gap-3 text-xs text-slate-500">
        <div className="h-px flex-1 bg-slate-800" />
        <span>or use email</span>
        <div className="h-px flex-1 bg-slate-800" />
      </div>
      {success ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-700/40 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            Your account was created. Verify your email before creating projects.
          </div>
          <p className="text-sm text-slate-300">
            {emailSent
              ? "We sent a verification email to your inbox."
              : "Email sending is not configured yet, so use the fallback verification link below."}
          </p>
          {verificationUrl && (
            <a
              href={verificationUrl}
              className="inline-block rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-light"
            >
              Verify email now
            </a>
          )}
          <p className="text-sm text-slate-400">
            After verification, continue to{" "}
            <Link href="/auth/signin" className="text-brand hover:underline">
              sign in
            </Link>
            .
          </p>
        </div>
      ) : (
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
          <span className="text-sm text-slate-400">Name (optional)</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-400">Password (min 8 characters)</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-light disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>
      )}
      <p className="mt-4 text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link href="/auth/signin" className="text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
