import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { suggestRoles, isAiAvailable } from "@/lib/ai";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAiAvailable()) {
    return NextResponse.json(
      { available: false, roles: [], error: "AI not configured" },
      { status: 503 }
    );
  }

  const body = await req.json();
  const roles = await suggestRoles({
    title: body.title ?? "",
    pitch: body.pitch,
    stage: body.stage,
    category: body.category,
    existingRoles: body.existingRoles
  });

  return NextResponse.json({ available: true, roles });
}
