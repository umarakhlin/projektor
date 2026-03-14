import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "@/components/providers";
import { HeaderAuth } from "@/components/header-auth";

export const metadata: Metadata = {
  title: "Projektor",
  description: "Execution-first platform where ideas become teams."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-50">
        <Providers>
          <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6">
            <header className="mb-6 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold">
                  P
                </div>
                <span className="text-lg font-semibold tracking-tight">
                  Projektor
                </span>
              </Link>
              <HeaderAuth />
            </header>
            <main className="flex-1">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
