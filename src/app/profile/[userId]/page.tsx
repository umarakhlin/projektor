"use client";

import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ReportButton } from "@/components/report-button";

type PublicProfile = {
  id: string;
  name: string | null;
  email?: string;
  skills: string[];
  links: { url: string; label?: string }[];
  availability: string | null;
};

export default function PublicProfilePage() {
  const params = useParams();
  const { data: session } = useSession();
  const userId = params.userId as string;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/profile/${userId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then(setProfile)
      .catch(() => setError("Profile not found"))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return <div className="mx-auto max-w-lg text-slate-400">Loading…</div>;
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-lg">
        <p className="text-red-400">{error || "Profile not found"}</p>
        <Link href="/" className="mt-4 block text-brand hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {profile.name || "Profile"}
        </h1>
        {session?.user?.id && profile.id && session.user.id !== profile.id && (
          <ReportButton targetType="User" targetId={profile.id} />
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-slate-700 bg-slate-900/50 p-6">
        {profile.email && (
          <div>
            <span className="text-sm text-slate-400">Email</span>
            <p className="text-slate-50">{profile.email}</p>
          </div>
        )}

        {profile.skills.length > 0 && (
          <div>
            <span className="text-sm text-slate-400">Skills</span>
            <p className="text-slate-50">
              {profile.skills.join(", ")}
            </p>
          </div>
        )}

        {profile.availability && (
          <div>
            <span className="text-sm text-slate-400">Availability</span>
            <p className="text-slate-50">{profile.availability}</p>
          </div>
        )}

        {profile.links.length > 0 && (
          <div>
            <span className="text-sm text-slate-400">Links</span>
            <ul className="mt-1 space-y-1">
              {profile.links.map((link, i) => (
                <li key={i}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand hover:underline"
                  >
                    {link.label || link.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!profile.email && profile.skills.length === 0 && !profile.availability && profile.links.length === 0 && (
          <p className="text-slate-500">This profile has no public information yet.</p>
        )}
      </div>

      <Link href="/" className="mt-6 block text-sm text-brand hover:underline">
        Back
      </Link>
    </div>
  );
}
