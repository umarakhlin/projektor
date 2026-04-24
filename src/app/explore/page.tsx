"use client";

import { Suspense, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ProjectsTab } from "./projects-tab";
import { PeopleTab } from "./people-tab";

type TabId = "projects" | "people";

function ExplorePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();

  const rawTab = searchParams.get("tab");
  const tab: TabId = rawTab === "people" ? "people" : "projects";

  const setTab = useCallback(
    (next: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "projects") {
        params.delete("tab");
      } else {
        params.set("tab", next);
      }
      const qs = params.toString();
      router.replace(qs ? `/explore?${qs}` : "/explore", { scroll: false });
    },
    [router, searchParams]
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Explore</h1>
        {status === "authenticated" && (
          <Link
            href="/saved"
            className="rounded-lg border border-brand/40 bg-brand/10 px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand/20"
          >
            Saved
          </Link>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Explore"
        className="mb-5 inline-flex rounded-lg border border-slate-700 bg-slate-900/40 p-1"
      >
        <TabButton
          active={tab === "projects"}
          onClick={() => setTab("projects")}
        >
          Projects
        </TabButton>
        <TabButton
          active={tab === "people"}
          onClick={() => setTab("people")}
        >
          People
        </TabButton>
      </div>

      {tab === "projects" ? <ProjectsTab /> : <PeopleTab />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={
        active
          ? "rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-white"
          : "rounded-md px-4 py-1.5 text-sm text-slate-400 hover:text-slate-100"
      }
    >
      {children}
    </button>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<p className="text-slate-400">Loading…</p>}>
      <ExplorePageInner />
    </Suspense>
  );
}
