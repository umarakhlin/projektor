import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { suggestProjectStructure, isAiAvailable } from "@/lib/ai";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAiAvailable()) {
    return NextResponse.json(
      { available: false, error: "AI not configured" },
      { status: 503 }
    );
  }

  const body = await req.json();
  const result = await suggestProjectStructure({
    pitch: body.pitch,
    problem: body.problem,
    solution: body.solution,
    stage: body.stage,
    category: body.category
  });

  return NextResponse.json({ available: true, ...result });
}
