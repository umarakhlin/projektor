import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { parseJsonArray } from "@/lib/safe-json";
import { ProjectStatusControls } from "@/components/project-status-controls";
import { ReportButton } from "@/components/report-button";
import { ProjectSaveHeartClient } from "@/components/project-save-heart-client";
import { BionicText } from "@/components/bionic-text";

export default async function ProjectDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true } },
      roles: true,
      memberships: {
        include: {
          user: { select: { id: true, name: true } },
          role: { select: { title: true } }
        }
      }
    }
  });

  if (!project) notFound();

  const session = await getServerSession(authOptions);
  const isOwner = session?.user?.id === project.ownerId;
  const isMember =
    isOwner ||
    project.memberships.some((m) => m.user.id === session?.user?.id);

  const rewardModels = parseJsonArray<{ type: string }>(project.rewardModels);

  const canApply = project.status === "Recruiting";
  const openRoles = project.roles.filter((r) => r.state !== "Filled");
  const totalRoles = project.roles.length;
  const allRolesFilled =
    totalRoles > 0 && openRoles.length === 0 && project.status === "Recruiting";

  let savedByMe = false;
  if (session?.user?.id) {
    const row = await prisma.savedProject.findFirst({
      where: { userId: session.user.id, projectId: project.id }
    });
    savedByMe = row != null;
  }

  const showSaveHeart =
    session &&
    !(isOwner && project.status === "Draft");

  const isProtectedView =
    project.visibility === "NDAGated" && !isOwner;

  return (
    <div className="mx-auto max-w-2xl">
      {isProtectedView && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <span aria-hidden>🔒</span>
          <span>
            <strong className="font-semibold">Confidential.</strong> You are
            viewing this project under the Projektor NDA you accepted at sign
            in. Do not copy, share, or screenshot this content outside the
            platform.
          </span>
        </div>
      )}
      <div className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              project.status === "Recruiting"
                ? "bg-green-500/20 text-green-400"
                : project.status === "Active"
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-slate-600 text-slate-400"
            }`}
          >
            {project.status}
          </span>
          <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-400">
            {project.stage}
          </span>
          <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-400">
            {project.category}
          </span>
          {rewardModels.map((r) => (
            <span
              key={r.type}
              className="rounded-full bg-brand/20 px-2 py-0.5 text-xs text-brand"
            >
              {r.type}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <BionicText
            as="h1"
            className="text-2xl font-semibold"
            text={project.title}
          />
          {showSaveHeart && (
            <ProjectSaveHeartClient
              projectId={project.id}
              initialSaved={!!savedByMe}
            />
          )}
        </div>
        <div className="mt-1 flex items-center gap-3">
          <p className="text-sm text-slate-400">
            by {project.owner.name ?? "Unknown"}
          </p>
          {session && session.user.id !== project.ownerId && (
            <ReportButton targetType="Project" targetId={project.id} />
          )}
        </div>
        {isOwner && project.status === "Draft" && (
          <div className="mt-4 rounded-xl border border-amber-700/40 bg-amber-500/10 px-4 py-3">
            <p className="text-sm font-medium text-amber-100">This project is still a draft</p>
            <p className="mt-1 text-sm text-amber-200/90">
              Only you can see it. Finish the create flow to publish and appear in Explore.
            </p>
            <Link
              href={`/create?draft=${encodeURIComponent(project.id)}`}
              className="mt-3 inline-block rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-light"
            >
              Continue editing draft →
            </Link>
          </div>
        )}

        {project.status === "Recruiting" && !session && (
          <p className="mt-3 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-400">
            <Link href="/auth/signin" className="font-medium text-brand hover:underline">
              Sign in
            </Link>{" "}
            to apply for a role or save this project.
          </p>
        )}

        {project.status === "Recruiting" && session && !isMember && !isOwner && (
          <p className="mt-3 text-sm text-slate-400">
            This team is recruiting. Pick a role below and send an application.
          </p>
        )}

        {project.status === "Active" && (
          <p className="mt-3 text-sm text-slate-500">
            This project is active. Open roles may be closed; check the list below.
          </p>
        )}

        {project.status === "Closed" && (
          <p className="mt-3 text-sm text-slate-500">
            This project is closed and is not accepting new applications.
          </p>
        )}

        {isMember && (
          <div className="mt-3 flex flex-col items-start gap-2">
            <Link
              href={`/projects/${project.id}/space`}
              className="inline-block rounded-lg border border-brand/50 bg-brand/10 px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand/20"
            >
              Open Team Space →
            </Link>
          </div>
        )}
      </div>

      {!project.pitch && !project.problem && !project.solution && project.status !== "Draft" && (
        <p className="mb-6 text-sm text-slate-500">
          No long description was added for this project yet.
        </p>
      )}

      {project.pitch && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-medium text-slate-400">Pitch</h2>
          <BionicText
            as="p"
            className="text-slate-200"
            text={project.pitch}
          />
        </section>
      )}

      {(project.problem || project.solution) && (
        <section className="mb-6">
          {project.problem && (
            <div className="mb-2">
              <h2 className="mb-1 text-sm font-medium text-slate-400">Problem</h2>
              <BionicText
                as="p"
                className="text-slate-200"
                text={project.problem}
              />
            </div>
          )}
          {project.solution && (
            <div>
              <h2 className="mb-1 text-sm font-medium text-slate-400">Solution</h2>
              <BionicText
                as="p"
                className="text-slate-200"
                text={project.solution}
              />
            </div>
          )}
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-medium text-slate-400">Expectations</h2>
        {project.hoursPerWeek && project.durationMonths ? (
          <p className="text-slate-200">
            {project.hoursPerWeek} hrs/week · {project.durationMonths} months
          </p>
        ) : (
          <p className="text-sm text-slate-500">
            Time commitment not listed. Ask the owner in your application or in Team Space if you join.
          </p>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-medium text-slate-400">Open roles</h2>
        {openRoles.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-5 text-sm text-slate-400">
            {totalRoles === 0 ? (
              <>
                <p>No roles are defined for this project yet.</p>
                {isOwner && project.status === "Draft" && (
                  <Link
                    href={`/create?draft=${encodeURIComponent(project.id)}`}
                    className="mt-2 inline-block font-medium text-brand hover:underline"
                  >
                    Add roles in the create flow →
                  </Link>
                )}
              </>
            ) : allRolesFilled ? (
              <p>All listed roles are filled right now. You can still save the project or follow the team for updates.</p>
            ) : (
              <p>No open roles at the moment.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {openRoles.map((role) => {
              const requirements = parseJsonArray<string>(role.requirements);
              return (
                <div
                  key={role.id}
                  className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 p-4"
                >
                  <div>
                    <h3 className="font-medium">{role.title}</h3>
                    <p className="text-sm text-slate-400">
                      {role.openings - role.filledCount} opening(s)
                      {requirements.length > 0 &&
                        ` · ${requirements.join(", ")}`}
                    </p>
                  </div>
                  {canApply && (
                    <Link
                      href={`/projects/${project.id}/apply/${role.id}`}
                      className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-light"
                    >
                      Apply
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {project.memberships.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-medium text-slate-400">Team</h2>
          <ul className="space-y-1 text-slate-200">
            {project.memberships.map((m) => (
              <li key={m.id}>
                {m.user.name ?? "Member"} — {m.role.title}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <ProjectStatusControls
          projectId={project.id}
          status={project.status}
          memberCount={project.memberships.length}
          isOwner={isOwner}
        />
        {isOwner && project.status !== "Draft" && (
          <Link
            href={`/projects/${project.id}/applications`}
            className="text-sm text-brand hover:underline"
          >
            View applications
          </Link>
        )}
      </div>

      <nav
        className="mt-10 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-800 pt-6 text-sm text-slate-500"
        aria-label="Page navigation"
      >
        <Link href="/" className="hover:text-slate-200">
          ← Home feed
        </Link>
        <Link href="/explore" className="hover:text-slate-200">
          Explore projects
        </Link>
        {session && (
          <Link href="/my-projects" className="hover:text-slate-200">
            My projects
          </Link>
        )}
      </nav>
    </div>
  );
}
