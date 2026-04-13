"use client";

import { captureException } from "@sentry/nextjs";
import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-50">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-slate-400">
            An unexpected error occurred. If the problem continues, try again later.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
