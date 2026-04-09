import Link from "next/link";
import { verifyEmailToken } from "@/lib/email-verification";

type VerifyEmailPageProps = {
  searchParams?: {
    token?: string;
  };
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const token = searchParams?.token ?? "";
  const result = token
    ? await verifyEmailToken(token)
    : { ok: false, message: "Missing verification token." };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-4 text-2xl font-semibold">
        {result.ok ? "Email verified" : "Verification failed"}
      </h1>
      <p className={result.ok ? "text-emerald-300" : "text-amber-300"}>
        {result.message}
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/auth/signin"
          className="rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-light"
        >
          Go to sign in
        </Link>
        <Link
          href="/auth/signup"
          className="rounded-lg border border-slate-700 px-4 py-2 text-slate-200 hover:border-slate-600"
        >
          Back to sign up
        </Link>
      </div>
    </div>
  );
}
