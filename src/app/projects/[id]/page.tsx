import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { parseJsonArray } from "@/lib/safe-json";
import { ProjectStatusControls } from "@/components/project-status-controls";
import { ReportButton } from "@/components/report-button";
import { ProjectSaveHeartClient } from "@/components/project-save-heart-client";

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

  return (
    <div className="mx-auto max-w-2xl">
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
          <h1 className="text-2xl font-semibold">{project.title}</h1>
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
          <div className="mt-3">
            <Link
              href={`/create?draft=${encodeURIComponent(project.id)}`}
              className="inline-block rounded-lg border border-brand bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-light"
            >
              Continue editing draft →
            </Link>
          </div>
        )}
        {isMember && (
          <div className="mt-3 flex flex-col items-start gap-2">
            <Link
              href={`/projects/${project.id}/space`}
              className="inline-block rounded-lg border border-brand/50 bg-brand/10 px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand/20"
            >
              Open Team Space →
            </Link>
            <Link href="/" className="text-sm text-brand hover:underline">
              ← Back to feed
            </Link>
          </div>
        )}
      </div>

      {project.pitch && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-medium text-slate-400">Pitch</h2>
          <p className="text-slate-200">{project.pitch}</p>
        </section>
      )}

      {(project.problem || project.solution) && (
        <section className="mb-6">
          {project.problem && (
            <div className="mb-2">
              <h2 className="mb-1 text-sm font-medium text-slate-400">Problem</h2>
              <p className="text-slate-200">{project.problem}</p>
            </div>
          )}
          {project.solution && (
            <div>
              <h2 className="mb-1 text-sm font-medium text-slate-400">Solution</h2>
              <p className="text-slate-200">{project.solution}</p>
            </div>
          )}
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-medium text-slate-400">Expectations</h2>
        <p className="text-slate-200">
          {project.hoursPerWeek && project.durationMonths
            ? `${project.hoursPerWeek} hrs/week · ${project.durationMonths} months`
            : "Not specified"}
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-medium text-slate-400">Open roles</h2>
        {openRoles.length === 0 ? (
          <p className="text-slate-500">No open roles</p>
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
    </div>
  );
}
