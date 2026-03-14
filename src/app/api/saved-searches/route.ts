import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { parseJsonObject } from "@/lib/safe-json";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const list = await prisma.savedSearch.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(
    list.map((s) => ({
      id: s.id,
      label: s.label,
      filters: parseJsonObject<Record<string, string>>(s.filtersJson, {})
    }))
  );
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { label, filters } = body as { label?: string; filters?: Record<string, string> };

  if (!label?.trim()) {
    return NextResponse.json(
      { error: "Label is required" },
      { status: 400 }
    );
  }

  const search = await prisma.savedSearch.create({
    data: {
      userId: session.user.id,
      label: label.trim(),
      filtersJson: filters && typeof filters === "object" ? JSON.stringify(filters) : "{}"
    }
  });

  return NextResponse.json({
    id: search.id,
    label: search.label,
    filters: parseJsonObject<Record<string, string>>(search.filtersJson, {})
  });
}
