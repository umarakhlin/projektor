"use client";

import { useState } from "react";
import { SaveProjectHeart } from "@/components/save-project-heart";

export function ProjectSaveHeartClient({
  projectId,
  initialSaved
}: {
  projectId: string;
  initialSaved: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  return <SaveProjectHeart projectId={projectId} saved={saved} onChange={setSaved} />;
}
