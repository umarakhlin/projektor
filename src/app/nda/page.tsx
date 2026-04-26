import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getNdaStatusForCurrentUser, NDA_VERSION } from "@/lib/nda";
import { NdaForm } from "./nda-form";

type NdaPageProps = {
  searchParams?: { callbackUrl?: string };
};

export default async function NdaPage({ searchParams }: NdaPageProps) {
  const status = await getNdaStatusForCurrentUser();

  if (!status) {
    const next = searchParams?.callbackUrl ?? "/";
    const callbackUrl = `/nda?callbackUrl=${encodeURIComponent(next)}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (!status.required) {
    redirect(searchParams?.callbackUrl ?? "/");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-medium uppercase tracking-wider text-brand">
        Confidentiality
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-50">
        Before you continue
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        Projektor is a place where people share unfinished ideas and look for
        teammates. Some of what you will read is sensitive. Each time you
        sign in we ask you to reaffirm the rules, so the platform stays a
        safe space for creators.
      </p>

      <section className="mt-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm leading-relaxed text-slate-200">
        <p className="font-semibold text-slate-50">By continuing, you agree:</p>
        <ul className="list-disc space-y-2 pl-5 text-slate-300">
          <li>
            Project pitches, problems, solutions, role details, and team
            chats you see on Projektor are <strong>confidential</strong>.
          </li>
          <li>
            You will <strong>not copy</strong>, replicate, or build the same
            idea on your own based on what you read here.
          </li>
          <li>
            You will <strong>not share</strong> the contents of any project
            outside Projektor without the explicit permission of the project
            owner.
          </li>
          <li>
            You will <strong>not screenshot, scrape, or republish</strong>{" "}
            project content for any purpose other than evaluating whether to
            apply or collaborate.
          </li>
          <li>
            Violations may lead to suspension of your account, public
            disclosure of the violation, and pursuit of legal remedies.
          </li>
        </ul>
        <p className="text-xs text-slate-500">
          This acknowledgement does not transfer ownership of any idea. Each
          project owner retains all rights in their work. Projektor logs
          your acceptance (timestamp + acknowledgement version) so we can
          help owners enforce these rules if needed.
        </p>
      </section>

      <Suspense fallback={null}>
        <NdaForm ndaVersion={NDA_VERSION} />
      </Suspense>
    </div>
  );
}
