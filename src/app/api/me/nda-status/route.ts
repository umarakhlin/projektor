import { NextResponse } from "next/server";
import { getNdaStatusForCurrentUser } from "@/lib/nda";

export async function GET() {
  const status = await getNdaStatusForCurrentUser();
  if (!status) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(status);
}
